import { RichFeatureSwitch } from './controls/featureControls'
import {
  PatternToken as PatternTokenControl,
  SortablePatternToken,
} from './controls/filenameControls'
import { DEFAULT_DIRECTORY } from '@backend/constants'
import { PatternToken } from '@backend/enums'
import V4FilenameSettingsUsecase from '@backend/settings/filenameSettings/usecase'
import { Button, Flex, HStack, Input, Select, VStack } from '@chakra-ui/react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import useDownloadSettings from '@pages/hooks/useDownloadSettings'
import useFilenameSettingsForm from '@pages/hooks/useFilenameSettingsForm'
import { i18n } from '@pages/utils'
import type { V4FilenamePattern } from '@schema'
import React, { memo } from 'react'

type TokenPanelProps = {
  handleTokenToggle: (token: PatternToken, state: boolean) => void
  handleTokenSort: (sourceIndex: number, destinationIndex: number) => void
  pattern: V4FilenamePattern
  previewFilename: string
}

const fp: [string, PatternToken][] = [
  [i18n('options_general_filenamePattern_token_account'), PatternToken.Account],
  [i18n('options_general_filenamePattern_token_accountId'), PatternToken.AccountId],
  [i18n('options_general_filenamePattern_token_tweetId'), PatternToken.TweetId],
  [i18n('options_general_filenamePattern_token_hash'), PatternToken.Hash],
  [i18n('options_general_filenamePattern_token_serial'), PatternToken.Serial],
  [i18n('options_general_filenamePattern_token_downloadDate'), PatternToken.Date],
  [i18n('options_general_filenamePattern_token_tweetDate'), PatternToken.TweetDate],
  [
    i18n('options_general_filenamePattern_token_tweetDatetime'),
    PatternToken.TweetDatetime,
  ],
  // [i18n('options_general_filenamePattern_token_datetime'), PatternToken.Datetime],
]

const TokenPanel = memo(
  ({ handleTokenToggle, handleTokenSort, pattern, previewFilename }: TokenPanelProps) => {
    const sortedTokens = fp
      .filter(([, token]) => pattern.includes(token))
      .sort((a, b) => pattern.indexOf(a[1]) - pattern.indexOf(b[1]))

    return (
      <>
        <Flex minH={'1.5em'} fontSize="1.2em">
          {previewFilename}
        </Flex>

        <DndContext
          sensors={useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
          )}
          collisionDetection={closestCenter}
          onDragEnd={event => {
            const { active, over } = event
            if (active.id === over.id) return
            handleTokenSort(
              active.data.current.sortable.index,
              over.data.current.sortable.index
            )
          }}
        >
          <Flex
            justifyContent={'flex-start'}
            gap={2}
            flexWrap={'wrap'}
            marginBottom={'0.5rem'}
            minH={'1.5em'}
          >
            <SortableContext items={sortedTokens.map(([, _token]) => _token)}>
              {sortedTokens.map(([name, token]) => (
                <SortablePatternToken
                  key={token}
                  name={name}
                  token={token}
                  handleRemove={() => handleTokenToggle(token, false)}
                />
              ))}
            </SortableContext>
          </Flex>
        </DndContext>

        <Flex justifyContent={'flex-start'} gap={'2'} flexWrap={'wrap'}>
          {fp.map(([name, token]) => (
            <PatternTokenControl
              key={token}
              tokenName={name}
              isOn={pattern.includes(token)}
              handleChange={s => handleTokenToggle(token, s)}
            />
          ))}
        </Flex>
      </>
    )
  }
)

const GeneralOptions = () => {
  const [filenameSettings, formStatus, formMsg, formHandler] = useFilenameSettingsForm()
  const [downloadSettings, toggler] = useDownloadSettings()

  if (!formStatus.isLoaded) return <></>

  const filenameUsecase = new V4FilenameSettingsUsecase(filenameSettings)
  const previewFilename = filenameUsecase.makeFilename(
    {
      id: '1145141919810',
      screenName: 'tweetUser',
      userId: '306048589',
      createdAt: new Date(2222, 1, 2, 12, 5, 38),
      displayName: 'NickName',
    },
    {
      serial: 2,
      hash: '2vfn8shkjvd98892pR',
      date: new Date(),
    }
  )

  return (
    <>
      {process.env.TARGET === 'firefox' && !downloadSettings.enableAria2 && (
        <RichFeatureSwitch
          name={i18n('options_general_askWhereToSave')}
          desc={i18n('options_general_askWhereToSave_desc')}
          isOn={downloadSettings.askWhereToSave}
          handleClick={toggler.askWhereToSave}
        />
      )}
      <form onReset={formHandler.reset} onSubmit={formHandler.submit}>
        <VStack>
          <RichFeatureSwitch
            name={i18n('options_general_filenamePattern')}
            desc={i18n('options_general_filenamePattern_desc')}
            message={formMsg.filenamePattern}
            cursor="default"
          >
            <TokenPanel
              pattern={filenameSettings.filenamePattern}
              handleTokenToggle={formHandler.patternTokenToggle}
              handleTokenSort={formHandler.patternTokenSort}
              previewFilename={previewFilename}
            />
          </RichFeatureSwitch>
          <RichFeatureSwitch
            name={i18n('options_general_subDirectory')}
            message={formMsg.directory}
            desc={i18n('options_general_subDirectory_desc')}
            isOn={!filenameSettings.noSubDirectory}
            handleClick={formHandler.directorySwitch}
          >
            <Input
              placeholder={DEFAULT_DIRECTORY}
              focusBorderColor={
                formStatus.dataIsChanged
                  ? formStatus.directoryIsValid
                    ? 'green.300'
                    : 'red.300'
                  : 'blue.300'
              }
              value={filenameSettings.directory}
              onInput={formHandler.directoryInput}
              onChange={formHandler.directoryInput}
              isDisabled={filenameSettings.noSubDirectory}
              isInvalid={!formStatus.directoryIsValid}
            />
          </RichFeatureSwitch>
          <RichFeatureSwitch
            name={i18n('options_general_fileAggregation')}
            desc={i18n('options_general_fileAggregation_desc')}
            isOn={filenameSettings.fileAggregation}
            handleClick={formHandler.aggregationToggle}
            cursor="pointer"
          >
            <Select
              isDisabled={!filenameSettings.fileAggregation}
              onChange={formHandler.handleAggregationTokenChange}
            >
              {fp.map(([name, token]) => (
                <option key={token} value={token}>
                  {name}
                </option>
              ))}
            </Select>
          </RichFeatureSwitch>
          <HStack>
            <Button type="reset" colorScheme={'red'} variant={'outline'}>
              {i18n('resetButtonText')}
            </Button>
            <Button
              type="submit"
              colorScheme={'green'}
              isDisabled={!Object.values(formStatus).every(v => v)}
            >
              {i18n('submitButtonText')}
            </Button>
          </HStack>
        </VStack>
      </form>
    </>
  )
}

export default GeneralOptions
