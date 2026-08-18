import { memo } from 'react'
import { View } from 'react-native'

import Section from '../components/Section'
import { createStyle, openUrl } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { showPactModal } from '@/core/common'
import TVButton from '@/components/common/TVButton'

// 关于页的每个链接封装为可聚焦的 TVButton（统一绿色边框）
const LinkBtn = ({ onPress, children }: {
  onPress: () => void
  children: React.ReactNode
}) => (
  <TVButton
    style={styles.linkBtn as any}
    onPress={onPress}
    borderRadius={4}
  >
    <View>{children}</View>
  </TVButton>
)

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const openHomePage = () => { void openUrl('https://github.com/lyswhut/lx-music-mobile#readme') }
  const openIssuePage = () => { void openUrl('https://github.com/lyswhut/lx-music-mobile/issues?q=is%3Aissue+') }
  const openGHReleasePage = () => { void openUrl('https://github.com/lyswhut/lx-music-mobile/releases') }
  const openFAQPage = () => { void openUrl('https://lyswhut.github.io/lx-music-doc/mobile/faq') }
  const openPactModal = () => { showPactModal() }
  const openPartPage = () => { void openUrl('https://github.com/lyswhut/lx-music-mobile#%E9%A1%B9%E7%9B%AE%E5%8D%8F%E8%AE%AE') }

  const textLinkStyle = {
    ...styles.text,
    textDecorationLine: 'underline',
    color: theme['c-primary-font'],
  } as const

  return (
    <Section title={t('setting_about')}>
      <View style={styles.part}>
        <Text style={styles.text}>本软件完全免费，代码已开源。开源地址：</Text>
        <LinkBtn onPress={openHomePage}>
          <Text style={textLinkStyle}>https://github.com/lyswhut/lx-music-mobile</Text>
        </LinkBtn>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>最新版下载地址：</Text>
        <LinkBtn onPress={openGHReleasePage}>
          <Text style={textLinkStyle}>GitHub Releases</Text>
        </LinkBtn>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>软件的常见问题可转至：</Text>
        <LinkBtn onPress={openFAQPage}>
          <Text style={textLinkStyle}>移动版常见问题</Text>
        </LinkBtn>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}><Text style={styles.boldText}>本软件没有客服</Text>，但我们整理了一些常见的使用问题。<Text style={styles.boldText}>仔细、仔细、仔细</Text>地阅读常见问题后，</Text>
        <Text style={styles.text}>仍有问题可到 GitHub </Text>
        <LinkBtn onPress={openIssuePage}>
          <Text style={textLinkStyle}>提交 Issue</Text>
        </LinkBtn>
        <Text style={styles.text}>。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>由于软件开发的初衷仅是为了对新技术的学习与研究，因此软件直至停止维护都将会一直保持纯净。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>目前本项目的原始发布地址<Text style={styles.boldText}>只有 GitHub</Text>，其他渠道均为第三方转载发布，可信度请自行鉴别。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}><Text style={styles.boldText}>本项目没有微信公众号之类的所谓「官方账号」，也未在小米、华为、vivo 等应用商店发布同名应用，谨防被骗！</Text></Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>你已签署本软件的</Text>
        <LinkBtn onPress={openPactModal}>
          <Text style={styles.text} color={theme['c-primary-font']}>许可协议</Text>
        </LinkBtn>
        <Text style={styles.text}>，协议的在线版本在</Text>
        <LinkBtn onPress={openPartPage}>
          <Text style={textLinkStyle}>这里</Text>
        </LinkBtn>
        <Text style={styles.text}>。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>By: </Text>
        <Text style={styles.text}>落雪无痕</Text>
      </View>
    </Section>
  )
})

const styles = createStyle({
  part: {
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    textAlignVertical: 'bottom',
  },
  boldText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlignVertical: 'bottom',
  },
  linkBtn: {
    borderRadius: 4,
  },
})
