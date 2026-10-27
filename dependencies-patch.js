// 修补依赖源码以使构建的依赖恢复正常工作

const fs = require('node:fs')
const path = require('node:path')

const rootPath = path.join(__dirname, './')

const patchs = [
  // 后台播放 CPU 优化：开启 ExoPlayer 动态调度。
  // 默认播放中主循环每 10ms 唤醒一次（每秒 100 次空转），开启后按音频缓冲
  // 实际需要睡眠（最长 1s），CPU 占用约减半。media3 1.8.0 已核实该 API 存在。
  [
    path.join(rootPath, 'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/MusicManager.java'),
    '.setWakeMode(WAKE_MODE_NONE)',
    '.setWakeMode(WAKE_MODE_NONE)\n                .experimentalSetDynamicSchedulingEnabled(true)',
  ],
]

;(async() => {
  for (const [filePath, fromStr, toStr] of patchs) {
    console.log(`Patching ${filePath.replace(rootPath, '')}`)
    try {
      const file = (await fs.promises.readFile(filePath)).toString()
      if (file.includes(toStr)) {
        console.log('  already patched, skip')
        continue
      }
      await fs.promises.writeFile(filePath, file.replace(fromStr, toStr))
    } catch (err) {
      console.error(`Patch ${filePath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  console.log('\nDependencies patch finished.\n')
})()

