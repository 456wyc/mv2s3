# mv2s3 上传工具
上传指定文件夹的内容到 s3， 并删除已上传的文件

**说明**
运行的时候，会把指定的目录重命名为新的临时目录，同时以指定目录的原名创建一个空目录；
上传完成后会删除临时目录

## 安装
`npm install -g @tinoq/mv2s3`

## 运行

### s3:
`mv2s3 -s /src -d a/b/c -i AccessKeyId -k AccessSecretKey -b wyc`

### minio:
`mv2s3 -s /src -d a/b/c -i AccessKeyId -k AccessSecretKey -b wyc -e endpoint -m true`

> 可以通过 crontab 定时运行

## 查看帮助

`mv2s3 -h`

```
Usage: mv2s3 [options]

Options:
  -V, --version            output the version number
  -s, --src <path>         【必要】源路径
  -d, --dest <path>        【必要】目标路径
  -i, --id <string>        【必要】aws_access_key_id
  -k, --key <string>       【必要】aws_secret_access_key
  -b, --bucket <string>    【必要】bucket
  -e, --endpoint <string>  endpoint, eg. http://127.0.0.1:9000
  -m, --minio <boolean>    use minio (default: false)
  -h, --help               output usage information
```