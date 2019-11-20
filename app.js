#!/usr/bin/env node
'use strict'
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
const AWS = require('aws-sdk')
const commander = require('commander')
const pkg = require('./package')

console.log('cwd', process.cwd(), 'pid', process.pid)
const program = new commander.Command()
program.version(pkg.version)
program
  .requiredOption('-s, --src <path>', '【必要】源路径')
  .requiredOption('-d, --dest <path>', '【必要】目标路径')
  .requiredOption('-i, --id <string>', '【必要】aws_access_key_id')
  .requiredOption('-k, --key <string>', '【必要】aws_secret_access_key')
  .requiredOption('-b, --bucket <string>', '【必要】bucket')
  .option('-e, --endpoint <string>', 'endpoint, eg. http://127.0.0.1:9000')
  .option('-m, --minio <boolean>', 'use minio', false)
  
program.parse(process.argv)

console.log('begin:', new Date())
start()

async function start(){
  const s3 = new AWS.S3({
    endpoint: program.endpoint,
    apiVersion: '2006-03-01',
    accessKeyId: program.id,
    secretAccessKey: program.key,
    httpOptions:{
      timeout: 300000
    },
    s3ForcePathStyle: program.minio, // needed with minio?
    // signatureVersion: 'v4'
  });
  // 检查 bucket 是否存在，线上账号无权查看，所以取消
  /* try{
    await checkBucket(program.bucket, s3)
  }catch(e){
    console.log('bucket 不存在')
    process.exit(1)
  } */
  let srcDirPath = path.resolve(process.cwd(), program.src)
  try{
    await fsPromises.access(srcDirPath)
  }catch(e){
    console.log('源路径不存在或者无权访问')
    process.exit(1)
  }
  let srcStat = await fsPromises.stat(srcDirPath);
  if(!srcStat.isDirectory()){
    console.log('源路径不是文件夹')
    process.exit(1)
  }

  try{
    //将文件夹更名，同时以原名创建新的文件夹
    let tempPath = path.resolve(`${srcDirPath}_temp_${process.pid}_${new Date().getTime()}`)
    await fsPromises.rename(srcDirPath, tempPath)
    console.info(`move src:${srcDirPath} to temp:${tempPath}`)
    await fsPromises.mkdir(srcDirPath)
    console.info(`upload local:${tempPath} \nto s3:${program.dest}`)
    await uploadDir(tempPath, tempPath, s3);
    console.log('finish:', new Date())
  }catch(e){
    console.info('运行错误：', e)
    console.info('重启...')
    // start()
  }
}


async function uploadDir(rootPath, dir, s3){
  try{
    await fsPromises.access(dir)
  }catch(e){
    console.log(`${dir} isn't exist, or don't have permission access`)
    return
  }
  let stat = await fsPromises.stat(dir);
  if(!stat.isDirectory()){
    console.log(`${dir} isn't directory`)
    return
  }
  let fileNameList = await fsPromises.readdir(dir);
  for(let filename of fileNameList){
    let filePath = path.resolve(dir, filename)
    let fileStat = await fsPromises.stat(filePath)
    if(fileStat.isDirectory()){
      await uploadDir(rootPath, filePath, s3)
    }else{
      await uploadFile(rootPath, filePath, s3)
    }
  }
  let afterList = await fsPromises.readdir(dir);
  if(afterList.length==0){
    await fsPromises.rmdir(dir)
    console.log('删除空文件夹', dir)
  }
}

function uploadFile(rootPath, filePath, s3){
  return new Promise((resolve, reject)=>{
    let fileRelativePath = path.relative(rootPath, filePath)
    let fileStream = fs.createReadStream(filePath)
    fileStream.on('error', function(err){
      console.log(`read ${filePath} err:${err}`);
      reject(err);
    })
    let keyString = `${program.dest}/${fileRelativePath}`;
    console.log(`upload ${filePath} to ${keyString}`)
    s3.upload({
      Bucket: program.bucket,
      Body: fileStream,
      Key: keyString
    }).on('httpUploadProgress', function(evt) {
      console.log(`${filePath}:${evt}`);
    }).send(async function(err, rs){
      if(err){
        reject(err)
      }else{
        await fsPromises.unlink(filePath)
        resolve(rs)
      }
    });
  })
}

async function checkBucket(bucket, s3){
  return new Promise((resolve, reject)=>{
    s3.headBucket({
      Bucket: bucket
    }, function(err, data) {
      if(err){
        console.log('checkBucket:err:', err); // an error occurred
        reject(err)
      }else{
        console.log('checkBucket:data:',data);           // successful response
        resolve(data)
      }
    });
  })
}