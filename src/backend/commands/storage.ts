import {
  downloadSettingsRepo,
  featureSettingsRepo,
  filenameSettingsRepo,
  statisticsRepo,
  twitterApiSettingsRepo,
  v4FilenameSettingsRepo,
} from '../configurations'
import { PatternToken } from '@backend/enums'
import { V4StatsUseCase } from '@backend/statistics/useCases'
import type { V4FilenamePattern, V4FilenameSettings } from '@schema'
import Browser from 'webextension-polyfill'

interface StorageMigrateCommand {
  readonly version: string
  execute(): Promise<void>
}

interface StorageBackupCommand {
  backup(): Promise<void>
  restore(): Promise<void>
  getBackup(area: 'sync' | 'local'): Promise<Record<string, unknown>>
}

/* eslint-disable no-console */
export const initStorage = async () => {
  console.groupCollapsed('Initialization')
  console.info('Initializing storage...')

  const statsUseCase = new V4StatsUseCase(statisticsRepo)
  await statsUseCase.syncWithDownloadHistory()

  await downloadSettingsRepo.setDefaultSettings()
  await v4FilenameSettingsRepo.setDefaultSettings()
  await featureSettingsRepo.setDefaultSettings()
  await twitterApiSettingsRepo.setDefaultSettings()

  await Browser.storage.sync.set({ version: '4.0.0' })
  await Browser.storage.local.set({ version: '4.0.0' })

  console.info('Done.')
  console.groupEnd()
}
/* eslint-enable no-console */

class BaseStorageBackup implements StorageBackupCommand {
  readonly backupKey = 'backup'

  async backup(): Promise<void> {
    const localData = await Browser.storage.local.get()
    delete localData[this.backupKey]
    await Browser.storage.local.set({ [this.backupKey]: localData })

    const syncData = await Browser.storage.sync.get()
    delete syncData[this.backupKey]
    await Browser.storage.sync.set({ [this.backupKey]: syncData })
  }

  async restore(): Promise<void> {
    const localBackup = await Browser.storage.local.get(this.backupKey)
    await Browser.storage.local.set(localBackup)

    const syncBackup = await Browser.storage.sync.get(this.backupKey)
    await Browser.storage.sync.set(syncBackup)
  }

  async getBackup(area: 'sync' | 'local'): Promise<Record<string, unknown>> {
    return await Browser.storage[area].get(this.backupKey)
  }
}

export class MigrateStorageToV4
  extends BaseStorageBackup
  implements StorageMigrateCommand
{
  readonly version: string = '4.0.0'

  async migrateAsyncData() {
    console.info('Migrate sync')
    const v3Settings = await filenameSettingsRepo.getSettings()
    const filenamePattern: V4FilenamePattern = []
    if (v3Settings.filename_pattern.account) filenamePattern.push(PatternToken.Account)
    filenamePattern.push(PatternToken.TweetId)
    filenamePattern.push(
      v3Settings.filename_pattern.serial === 'order'
        ? PatternToken.Serial
        : PatternToken.Hash
    )

    const v4Settings: V4FilenameSettings = {
      noSubDirectory: v3Settings.no_subdirectory,
      directory: v3Settings.directory,
      filenamePattern: filenamePattern,
      groupBy: PatternToken.Account,
      fileAggregation: false,
    }

    await Browser.storage.sync.remove(Object.keys(v3Settings))
    await v4FilenameSettingsRepo.saveSettings(v4Settings)
    await Browser.storage.sync.set({ version: this.version })
  }

  async migrateLocalData() {
    console.info('Migrate local')
    const s = await Browser.storage.local.get({ aggressive_mode: false })
    await Browser.storage.local.set({ aggressiveMode: s.aggressive_mode })
    await Browser.storage.local.set({ version: this.version })
    await Browser.storage.local.remove('aggressive_mode')
  }

  async execute(): Promise<void> {
    console.groupCollapsed('Migrate storage to v4')

    console.info('Backup old data')
    await this.backup()

    const localVersion = await Browser.storage.local.get('version')
    if (!('version' in localVersion)) await this.migrateLocalData()

    const syncVersion = await Browser.storage.sync.get('version')
    if (!('version' in syncVersion)) await this.migrateAsyncData()

    console.groupEnd()
  }
}
