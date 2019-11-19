#!/usr/bin/env node
'use strict'
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
const shell = require('shelljs')
const chokidar = require('chokidar')
const commander = require('commander')
const pkg = require('./package')

console.log('cwd', process.cwd())
const program = new commander.Command()
program.version(pkg.version)
program
  .requiredOption('-s, --src <path>', '【必要】源路径')
  .requiredOption('-d, --dest <path>', '【必要】目标路径')

program.parse(process.argv)

if (!program.src) {
  console.info('请指定源目录，使用： -s --src')
  process.exit(1)
}
if (!program.dest) {
  console.info('请指定目标目录，使用： -d --dest')
  process.exit(1)
}

start()

async function start(){
  console.info('running...')
  try{
    let srcDirPath = path.resolve(process.cwd(), program.src)
    let destDirPath = path.resolve(process.cwd(), program.dest)
    console.info(`src:${srcDirPath}\ndest:${destDirPath}`)
    try{
      await fsPromises.access(srcDirPath)
    }catch(e){
      console.info('源目录不存在或无权访问',e)
      process.exit(1)
    }
    try{
      await fsPromises.access(destDirPath, fs.constants.W_OK)
    }catch(e){
      console.info('目标目录不存在或无权访问',e)
      process.exit(1)
    }
    let srcStat = await fsPromises.stat(srcDirPath)
    let destStat = await fsPromises.stat(destDirPath)
    if (!srcStat.isDirectory()) {
      console.info('源路径必须为文件夹')
      process.exit(1)
    }
    if (!destStat.isDirectory()) {
      console.info('目标路径必须为文件夹')
      process.exit(1)
    }

    const srcDirWatcher = chokidar.watch(srcDirPath, {
      persistent: true,
      ignoreInitial: true
    })
    srcDirWatcher
      .on('add', async (filePath)=>{
        console.info('监视到新增文件:', filePath)
        let fileRelativePath = path.relative(srcDirPath, filePath)
        let destFileFullPath = path.resolve(destDirPath, fileRelativePath)
        try{
          let fileStat = await fsPromises.stat(filePath)
          let destFileDirPath = path.dirname(destFileFullPath)
          await fsPromises.mkdir(destFileDirPath,{recursive:true})
          let rs = shell.cp('-rf', filePath, destFileFullPath)
          await fsPromises.utimes(destFileFullPath, fileStat.atime, fileStat.mtime) //保留时间戳
          console.info(` ${filePath} 到 ${destFileFullPath} ${rs.stderr?'失败['+rs.stderr+']':'成功'}!`)
        }catch(e){
          console.info('备份失败:', e)
        }
      })
      console.log('监视中...')
  }catch(e){
    console.info('运行错误：', e)
    console.info('重启...')
    start()
  }
}