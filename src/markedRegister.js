/**
 * 将md文件编译成tsx
 * */
require('babel-polyfill');
const fs = require('fs');
const marked = require('marked');
const path = require('path');
const mdPath = path.join(__dirname, './marks');
const jsonPath = path.join(__dirname, './compileResults');

//取p标签中的值
const extractCenter = /<p.*?>\{([\s\S]*)\}<\/p>/;
//取p标签之后的值
const extractAfter = /\}<\/p>\n([\s\S]*)/;
//取所有类型的标签里的内容
const extractSome = /<.*?>([\s\S]*)<\/.*?>/;

//排除字符
const removeStr = /\s+/g;


class MarkedCompile {
  constructor() {
    this.buffs = [];
    this.files = [];
    this.tag = {};
    this.categorie = {};
  }
  //读取文件夹下所有md文件
  readDirs(path, options) {
  
    this.files = fs.readdirSync(path, options);
  }

  //解析html字符串信息
  analysisInfo(data) {
    let text = data.match(extractCenter)[1].replace(removeStr, ""),
        strs = text.split(';'),
        attr = {};
    //提取标题及标签等信息
    strs.map(v => {
      if (v) {
        let str = v.split(':');
        attr[str[0]] = str[1];
      }
    });

    //剔除首个p标签
    attr.content = data.match(extractAfter)[1];
    
    attr.introduce = this.extract(data, 200);
    return {
      ...attr
    }
  }

  //按类别分类
  divideInCategorie(obj) {
    if (!this.categorie[obj.categorie]) {
      this.categorie[obj.categorie] = [];
    }
    this.categorie[obj.categorie].push(obj);
  }
  //按标签分类
  divideInTag(obj) {
    let tags = obj.tag.split(',');

    tags.forEach((v) => {
      if (!this.tag[v]) {
        this.tag[v] = [];
      }
      this.tag[v].push(obj);
    })
  }

  //提取n个左右字符
  extract(src, n) {
    let replisome = src;
    //剔除文章配置项
    let strs = replisome.split('}'),
        dc = '';
    strs.map((v, index) => {
      if (index > 0) {
        dc += v
      }
    });
    //删除所有标签
    dc = dc.replace(/<.*?>/ig, "");
    //删除首尾\n字符
    let m = 0;
    for (let i = 0; i < dc.length; i++) {
      if (dc[i] && dc[i] != '\n') {
        m = i;
        break;
      }
    }
    dc = dc.substr(m);
    if (dc[dc.length - 1] == '\n') {
      dc = dc.substr(0, dc.length - 2)
    }
    replisome = dc;
    
    return replisome.slice(0, n);
  }
  //遍历读取md文件内容
  async readContent() {
    await this.readDirs(mdPath, {
      encoding: 'utf-8'
    });
    this.files.forEach((v, index) => {
      //将所有文件流存入数组
      let val = fs.readFileSync(`${mdPath}/${v}`, {
        encoding: 'utf8'
      });
      let data = marked(val);
      let compiled = this.analysisInfo(data);
      compiled.index = index; //添加索引
      //进入result数据流
      this.buffs.push(
        {
          ...compiled,
          name: v.split('.')[0].toUpperCase()
        }
      )
      //进入categorie数据流
      this.divideInCategorie(compiled);
      //进入tag数据流
      this.divideInTag(compiled);
    });
  }
  async writeStreamToJson() {
    await this.readContent();

    const results = JSON.stringify(this.buffs, null, '\t');
    const tags = JSON.stringify(this.tag, null, '\t');
    const categories = JSON.stringify(this.categorie, null, '\t');

    fs.writeFile(`${jsonPath}/results.json`, results, 'utf8', (err) => {
      if (err) {
        console.log(err);
      }
      console.log('全部结果写入成功-----------')
    });

    fs.writeFile(`${jsonPath}/tags.json`, tags, 'utf8', (err) => {
      if (err) {
        console.log(err);
      }
      console.log('tag结果写入成功-----------')
    });

    fs.writeFile(`${jsonPath}/categories.json`, categories, 'utf8', (err) => {
      if (err) {
        console.log(err);
      }
      console.log('categories结果写入成功-----------')
    });
  }
  start() {
    this.writeStreamToJson()
  }
}
const lig = new MarkedCompile();
lig.start();