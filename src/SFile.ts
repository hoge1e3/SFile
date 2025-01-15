
import { default as Content } from "./Content.js";
import {MIMETypes,defaultMIMETYpes} from "./MIMETypes.js";
export { default as Content } from "./Content.js";
type DependencyContainer={
  fs: typeof import("node:fs"),
  path: typeof import("node:path"),
  Buffer: typeof Buffer,
  //process: typeof import("node:process"),
}
type BinTypeOption={binType:typeof Buffer|typeof ArrayBuffer};
type Stats=import("node:fs").Stats;
export type MetaInfo={
  lastUpdate:number,
  link?: string,
  // if this is a link, indicates whether the destination is a directory
  //isDirPath?: boolean, // undefined=unknown, true=dir, false=regular file
  //stat?: Stats,  // if this is a link, the stats of the destination
  //lstat?: Stats, // if this is a link, the stats of the link itself
};

export type ExcludeFunction=(f:SFile)=>boolean;
export type ExcludeHash={[key:string]: any};
export type ExcludeOption=(ExcludeFunction | string[] | ExcludeHash);
export type DirectoryOptions={excludes?: ExcludeOption, excludesF?:ExcludeFunction, includeDir?:boolean};
export type ListFilesOptions=DirectoryOptions&{cacheMeta?:number|boolean};
export type RecursiveOptions=ListFilesOptions&{followlink?:boolean};
export type GetDirTreeExcludeFunction=(f:SFile, options:GetDirTreeExcludeFunctionArgs)=>boolean;
export type GetDirStyle = "flat-absolute" | "flat-relative" | "hierarchical" | "no-recursive";
export type GetDirTreeOptions={excludes?: ExcludeOption|GetDirTreeExcludeFunction , style:GetDirStyle, base?:SFile};
export type GetDirTreeExcludeFunctionArgs={fullPath:string, relPath:string, style:GetDirStyle};
export type FileCallback=(f:SFile)=>any;
export async function getNodeFS():Promise<FileSystemFactory> {
  const fs = await import(/* webpackIgnore: true */"node:fs");
  const path = await import(/* webpackIgnore: true */"node:path");
  return new FileSystemFactory({fs, path, Buffer});
}
export class FileSystemFactory {
  mimeTypes: MIMETypes=defaultMIMETYpes;
  constructor(public deps: DependencyContainer) {
      Content.setBufferPolyfill(deps.Buffer);
  }
  addMIMEType(extension:string, contentType:string) {
    this.mimeTypes[extension]=contentType;
  }
  _normalizePath(inputPath:string) {
    // Normalize path to use forward slashes and resolve to absolute path
    if (inputPath.startsWith("file://")) {
      /*
       Windows:  file:///C:/folder/file.txt  -> C:/folder/file.txt
       Unix/Linux: file:///home/user/file.txt -> /home/user/file.txt
      */
      inputPath=inputPath.substring("file://".length);
      if (inputPath.match(/^\/[a-zA-Z]:/)) {
        inputPath=inputPath.substring(1);
      }
    }
    return (
      this.deps.path.
        resolve(inputPath).
        replace(/\\/g,"/")
	  +(inputPath.match(/[\/\\]$/)?
	      "/":"")
	).replace(/\/+/g,"/");
  }
  get(inputPath:string) {
    //const normalizedPath = this._normalizePath(inputPath);
    return new SFile(this, inputPath);//normalizedPath);
  }
}
export type Policy={
  topDir: SFile;
}
export type DirTree = { [key: string]: MetaInfo | DirTree };
function truncSep(path:string) {
  return path.replace(/[\/\\]+$/,"");
}
function addSep(path:string){
  return truncSep(path)+"/";
}
export class Cache<T> {
  private value:Partial<T>={};
  public timestamp:number=0;
  constructor(public duration:number=1000){}
  public set(v:Partial<T>) {
    this.poke(v);
    this.timestamp=Date.now();
  }
  public poke(v:Partial<T>) {
    this.value=v;
  }
  public get():Partial<T> {
    return this.valid() ? this.value :{};
  }
  public valid() {
    return ( this.timestamp>=0 && (this.duration==0 || Date.now()-this.timestamp<this.duration) );
  }
  public clear(){
    this.value={};
  }
  public setDuration(d:number){this.duration=d;}
}
export type CachedInfo={
  //meta: MetaInfo,
  lstat: Stats,
  content: Content;
};
export class SFile {
  static is(obj:any):obj is SFile {
    return obj instanceof SFile;
  }
  #path:string;
  readonly _path:string;// Just debug info
  #fs:FileSystemFactory;
  #policy: Policy|undefined;
  public cache = new Cache<CachedInfo>();
  constructor(__fs:FileSystemFactory, filePath:string, policy?: Policy) {
    this.#fs=__fs;
    this.#path = __fs._normalizePath(filePath); 
    this.#policy=policy;
    if (policy && !policy.topDir.contains(this)) {
      throw new Error(`Cannot create files outside ${policy.topDir}`);
    }
    this._path=this.#path;
  }
  setPolicy(p:Policy) {
    if (this.#policy) throw new Error("policy already set");
    return new SFile(this.#fs, this.#path, p);
  }
  clone(_path?:string) {
    const path=_path||this.#path;
    return new SFile(this.#fs, path, this.#policy);
  }

  // File content methods
  text(str:string):this;
  text():string;
  text(str?:string) {
    if (str === undefined) {
      return this.getText();
    }
    return this.setText(str);
  }
  lines():string[] {
    return this.getText().split("\n");
  }
  getText():string{
    const {fs,path}=this.#fs.deps;
    return fs.readFileSync(this.#path, 'utf8');
  }
  setText(str:string):this {
    const {fs,path}=this.#fs.deps;
    this.prepareDir();
    fs.writeFileSync(this.#path, str, 'utf8');
    this.cache.clear();
    return this;
  }
  appendText(str:string) {
    const {fs,path}=this.#fs.deps;
    this.prepareDir();
    fs.appendFileSync(this.#path, str);
  }
  getBlob():Blob {
    return new Blob([this.bytes()],{type:this.contentType()});
  }
  async setBlob(blob:Blob):Promise<ArrayBuffer> {
    return new Promise(
      (succ:(a:ArrayBuffer)=>void)=>
        blob.arrayBuffer().then((a:ArrayBuffer)=>succ(this.setBytes(a))));
  }
  obj(o:object):this;
  obj():object;
  obj(o?:object) {
    if (o === undefined) {
      return JSON.parse(this.text());
    }
    this.text(JSON.stringify(o, null, 2));
    return this;
  }
  bytes(b:ArrayBuffer):this;
  bytes(b:Buffer):this;
  bytes():Buffer;
  bytes(b?: ArrayBuffer|Buffer) {
    if (b === undefined) {
      return this.getBytes();
    }
    this.setBytes(b);
    return this;
  }
  setBytes(b: ArrayBuffer|Buffer) {
    const {fs,path,Buffer}=this.#fs.deps;
    this.prepareDir();
    if (Content.isArrayBuffer(b)) {
      const bb=Buffer.from(b);
      fs.writeFileSync(this.#path, bb);
    } else {
      fs.writeFileSync(this.#path, b);
    }
    this.cache.clear();
    return b;
  }
  getBytes(options?:BinTypeOption):Buffer|ArrayBuffer {
    const {fs,path,Buffer}=this.#fs.deps;
    const binType=options?.binType||Buffer;
    const buffer = fs.readFileSync(this.#path);
    return binType === ArrayBuffer ? Content.buffer2ArrayBuffer(buffer) : buffer;
  }
  dataURL(url:string):this;
  dataURL():string;
  dataURL(url?:string):this|string{
    if (!url) {
      return this.getContent().toURL();
    }
    return this.setContent(Content.url(url));
  }
  stat():Stats {
    const {fs,path}=this.#fs.deps;
    return fs.statSync(this.#path);
  }
  lstat():Stats {
    const {fs,path}=this.#fs.deps;
    const cached=this.cache.get().lstat;
    if (cached) return cached;
    return fs.lstatSync(this.#path);
  }
  getMetaInfo({nofollow}={nofollow:false}):MetaInfo{
    const {fs,path}=this.#fs.deps;
    if (nofollow) {
      const lstat = this.lstat();
      return {
        lastUpdate: lstat.mtimeMs,
        link: lstat.isSymbolicLink() ? fs.readlinkSync(this.#path) : undefined,
      };
    } else {
      const stat = this.stat();
      return {
        lastUpdate: stat.mtimeMs,
        // link is undefined because the link is resolved by statSync
      };  
    }
  }
  setMetaInfo(m:{lastUpdate:number}):this{
    const {fs,path}=this.#fs.deps;
    const stats = fs.statSync(this.#path);
    fs.utimesSync(this.#path, stats.atime, new Date(m.lastUpdate));
    this.cache.clear();
    return this;
  }
  size(){
    const {fs,path}=this.#fs.deps;
    const stats = fs.statSync(this.#path);
    return stats.size;
  }
  // File metadata and operations
  lastUpdate():number {
    const {fs,path}=this.#fs.deps;
    const stats = fs.statSync(this.#path);
    return stats.mtimeMs;
  }
  rm(options:{r?:boolean, recursive?:boolean} = {}) {
    const {fs,path}=this.#fs.deps;
    if (this.isDir({nofollow:true})) {
      if (options.r || options.recursive) {
        fs.rmSync(this.#path, { recursive: true, force: true });
      } else {
        fs.rmdirSync(this.#path);
      }
    } else {
      fs.unlinkSync(this.#path);
    }
    this.cache.clear();
    return this;
  }
  

  exists() {
    const {fs,path}=this.#fs.deps;
    if (this.cache.get().lstat) {
      return true;
    }
    return fs.existsSync(this.#path);
  }

  isDir({nofollow}={nofollow:false}):boolean {
    // nofollow: if true and this is a link, returns false.
    const {fs,path}=this.#fs.deps;
    if (nofollow) {
      const lstat=this.cache.get().lstat;
      if (lstat) return lstat.isDirectory();
    }
    if (!this.exists()) return false;
    if (nofollow) {
      return fs.lstatSync(this.#path).isDirectory();
    } else {
      return fs.statSync(this.#path).isDirectory();
    }
  }
  isDirPath(){
    return this.#path.endsWith("/");
  }

  // Path and naming methods
  path() {
    return this.#path;
  }
  equals(s:string|SFile):boolean{
    if (typeof s=="string") {
      return this.path()===s;
    } else {
      return this.path()===s.path();
    }
  }

  name() {
    const {fs,path}=this.#fs.deps;
    return path.basename(this.#path)+(this.#path.endsWith("/")?"/":"");
  }

  ext() {
    const {fs,path}=this.#fs.deps;
    return path.extname(this.#path);
  }

  truncExt(e:string) {
    const name = this.name();
    if (e === undefined) {
      e = this.ext();
    }
    return name.substring(0, name.length-e.length);
  }

  // Relative and navigation methods
  up() {
    const {fs,path}=this.#fs.deps;
    return this.clone(path.dirname(this.#path));
  }

  sibling(name:string) {
    return this.up().rel(name);
  }
  closest(name:string|((f:SFile)=>any)):SFile|undefined {
    if (typeof name==="string"){
      return this.closest((f:SFile)=>f.name()===name);
    } else {
      const f=(f:SFile):SFile|undefined=>{
        const res=name(f);
        if (SFile.is(res))return res;
        if (res) return f;
        return undefined;
      }
      for(let p:SFile=this;p;p=p.up()) {
        const r=f(p);
        if (r) return r;
      }
      return undefined;
    }
  }

  relPath(base:SFile) {
    const {fs,path}=this.#fs.deps;
    const body=path.relative(base.path(), this.#path).replace(/\\/g,"/");
    return (
      body+(body.length && this.isDirPath()?"/":"")
    ).replace(/\/+$/,"/");
  }

  rel(relPath:string) {
    const {fs,path}=this.#fs.deps;
    if(path.isAbsolute(relPath)) throw new Error(`rel: ${relPath} should be relative`);
    return this.clone(path.join(this.#path, relPath));
  }
  _directorify() {
    if (!this.isDirPath()) this.#path+="/";
  }

  // Copy and move methods
  copyFrom(src:SFile) {
    return src.copyTo(this);
  }
  toString(){return this.#path;}
  /**
   * src.copyTo(dst) is equivalent to cp -r src/* dst/ , not cp -r src dst
   * @param dst 
   * @param options 
   * @returns 
   */
  copyTo(dst:SFile, options={followlink:false as boolean}):SFile{
    let src:SFile=this;
    const followlink=options.followlink;
    if (followlink) {
      src=src.resolveLink();
      dst=dst.resolveLink();
    }
    const nofollow=!followlink;
    const srcIsDir=src.isDir({nofollow});
    let dstIsDir=dst.isDir({nofollow});
    if (!srcIsDir && dstIsDir) {
      dst=dst.rel(src.name());
      dst.assertRegularFile();
      dstIsDir=false;
    }
    if (srcIsDir && !dstIsDir) {
      throw new Error("Cannot move dir "+src.path()+" to file "+dst.path());
    } else if (!srcIsDir && !dstIsDir) {
      if (src.isLink()) src=src.resolveLink();
      if (dst.isLink()) dst=dst.resolveLink();
      const c=src.getContent();
      dst.setContent(c);
    } else {
      if (!srcIsDir || !dstIsDir) throw new Error(src+" to "+dst+" should both dirs");
      for (let e of src.listFiles({cacheMeta:1000})) {
        e.copyTo(dst.rel(e.relPath(src)),options);
      }
    }
    dst.cache.clear();
    return dst;
  }

  moveFrom(src:SFile) {
    return src.moveTo(this);
  }

  moveTo(dst:SFile) {
    /*if (dst.exists()) {
      throw new Error(`${dst.path()} already exists`);
    }*/
    const {fs,path}=this.#fs.deps;
    fs.renameSync(this.#path, dst.#path);
    this.cache.clear();
    /*this.copyTo(dst);
    this.rm({recursive:true});*/
    return dst;
  }
  contentType() {
    return this.#fs.mimeTypes[this.ext()]||"application/octet-stream";
  }
  isText(){
    return this.contentType().match(/^text\//);
  }
  getContent():Content{
    const {fs,path}=this.#fs.deps;
    /*if (this.isText()) {
      const text=fs.readFileSync(this.#path, "utf-8");
      if (Content.looksLikeDataURL(text)) {
        return Content.url(text);
      } else {
        return Content.plainText(text);
      }
    } else {*/
      return Content.bin(fs.readFileSync(this.#path),this.contentType());
    //}
  }
  setContent(c:Content):this{
    const {fs,path,Buffer}=this.#fs.deps;
    this.prepareDir();
    if (c.hasPlainText()) {
      fs.writeFileSync(this.#path, c.toPlainText());
    } else{
      fs.writeFileSync(this.#path, c.toBin(Buffer));
    }
    this.cache.clear();
    return this;
  }
  appendContent(c:Content):this {
    const {fs,path,Buffer}=this.#fs.deps;
    this.prepareDir();
    if (c.hasPlainText()) {
      fs.appendFileSync(this.#path, c.toPlainText());
    } else{
      fs.appendFileSync(this.#path, c.toBin(Buffer));
    }
    this.cache.clear();
    return this;    
  }
  assertDir(options={nofollow:false as boolean}) {
    if (!this.isDir(options)) {
      throw new Error(`${this.path()} is not a directory`);
    }
  }
  assertRegularFile(options={nofollow:false as boolean}) {
    if (this.isDir(options)) {
      throw new Error(`${this.path()} is a directory`);
    }
  }
  // Directory methods
  parseExcludeOption(options:DirectoryOptions={}):{excludesF:ExcludeFunction} {
    this.assertDir();
    const excludes=options.excludes;
    if (typeof excludes==="function") {
        return {excludesF:excludes as ExcludeFunction};
    } else if (typeof excludes==="object") {
      const pathR=this.path();
      let nex:ExcludeHash={};
      const cpath=(e:string)=>{
        e=truncSep(e);
        if (e.startsWith("/")) {
          nex[e]=1;
        } else {
          nex[pathR+e]=1;
        }
      };
      if (Array.isArray(excludes)) {
        for (let e of excludes) cpath(e);
      } else {
        for (let e in excludes) cpath(e);
      }
      return {excludesF:(f)=>nex[truncSep(f.path())]};
    } else {
      return {excludesF:()=>false};
    }
  }
  each(callback:(file:SFile)=>void, options?:DirectoryOptions) {
    const {fs,path}=this.#fs.deps;
    this.assertDir();
    const files = fs.readdirSync(this.#path);
    const {excludesF}=this.parseExcludeOption(options);
    files.forEach(file => {
      const fileObj = this.rel(file);
      if (!excludesF(fileObj)) callback(fileObj);
    });
    return this;
  }
  recursive():Generator<SFile>;
  recursive(options:RecursiveOptions):Generator<SFile>;
  recursive(callback:FileCallback, options:RecursiveOptions):this;
  recursive(a1?:FileCallback|RecursiveOptions, a2?:RecursiveOptions) {
    const options:RecursiveOptions=a2 ?? ((a1 && typeof a1==="object") ? a1 : {});
    const callback:FileCallback|undefined=(a1 && typeof a1==="function" ? a1 : undefined); 
    this.assertDir();
    if (callback) {
      for (let file of this.recursive(options)) {
        callback(file);
      }
      return this;
    } else {
      const includeDir=options.includeDir;
      //const {excludesF}=this.parseExcludeOption(options);
      const self=this;
      return {
        *[Symbol.iterator](){
          function* walk(dir: SFile):Generator<SFile> {
            //console.log("walk", dir.path(),includeDir);
            if (includeDir) {
              yield dir;
            }
            for (const file of dir.listFiles(options)) {
              if (file.isLink()){
                const r=file.resolveLink();
                const isd=r.isDir({nofollow:true});
                if (options.followlink && isd) {
                  yield* walk(r);
                } else if (!isd || includeDir) yield r;
              } else if (file.isDir({nofollow:true})) {
                yield* walk(file);
              } else {
                yield file;
              }             
            }
          }
          yield* walk(self);
        }
      };
    }
  }
  
  getDirTree(options:GetDirTreeOptions={style: "flat-absolute"}):DirTree {
    let dest = {} as DirTree;
    options.style = options.style || "flat-absolute";
    let excludesFunc:GetDirTreeExcludeFunction;
    if (typeof options.excludes==="function") {
        excludesFunc=options.excludes as GetDirTreeExcludeFunction;
    } else {
        const excludesAry = (options.excludes || []).map(truncSep);
        const defaultExcludes=(f:SFile, {fullPath, relPath, ...options}: GetDirTreeExcludeFunctionArgs)=>{
            switch (options.style) {
                case "flat-relative":
                case "hierarchical":
                    if (excludesAry.indexOf(truncSep(relPath)) >= 0) {
                        return true;
                    }
                    break;
                case "flat-absolute":
                    if (excludesAry.indexOf(truncSep(fullPath)) >= 0) {
                        return true;
                    }
                    break;
            }
            return false;
        };
        excludesFunc=defaultExcludes;
    }
    let base=options.base||this;
    const files = this.listFiles({...options, cacheMeta:true});
    if (options.style == "no-recursive") {
      for (let file of files) {
        dest[file.name()] = file.getMetaInfo({nofollow:true});
      }
      return dest;
    }
    const newoption = {style: options.style, base};
    for (let file of files) {
        const meta = file.getMetaInfo({nofollow:true});
        const fullPath = file.path();
        const relPath = file.relPath(base);
        if (excludesFunc(file, {fullPath, relPath,  ...options})) continue;
        if (file.isDir({nofollow:true})) {
            switch (options.style) {
                case "flat-absolute":
                case "flat-relative":
                    Object.assign(dest, file.getDirTree(newoption));
                    break;
                case "hierarchical":
                    dest[addSep(file.name())] = file.getDirTree(newoption);
                    break;
            }
        } else {
            switch (options.style) {
                case "flat-absolute":
                    dest[fullPath] = meta;
                    break;
                case "flat-relative":
                    dest[relPath] = meta;
                    break;
                case "hierarchical":
                    dest[file.name()] = meta;
                    break;
            }
        }
    }
    return dest;
  }

  /**
   * 
   * @param options cacheMeta: 
   *          If true, the metaInfo(result of .getMetaInfo()) of each file object is cached in the file object. 
   *          If false, the metaInfo is retrieved each time from the file system when .getMetaInfo is called.
   *          true is more efficient but the metainfo is NOT changed even if the file is modified by other processes.
   * @returns 
   */
  listFiles(options:ListFilesOptions={cacheMeta:1000}) {
    const {fs,path}=this.#fs.deps;
    const {excludesF}=this.parseExcludeOption(options);
    if (options.cacheMeta || options.cacheMeta===0) {
      // cacheMeta implicitly sets nofollow: true
      if (!this.isDir({nofollow:true})) {
        throw new Error(this+' is not a directory');
      }
      const res=[] as SFile[];
      for (let dirent of fs.readdirSync(this.#path, {withFileTypes: true})) {
        const file=this.rel(dirent.name);
        if (excludesF(file)) continue;
        const extra=(dirent as any).extra;
        const lstat=(extra && extra.lstat? extra.lstat : file.lstat()) as Stats;
        file.cache.set({lstat});
        file.cache.setDuration(typeof options.cacheMeta==="boolean"?0:options.cacheMeta);
        if (lstat.isDirectory()) {
          file._directorify();
        }
        res.push(file);      
      }
      return res;
    }
    if (!this.isDir()) {
      throw new Error(this+' is not a directory');
    }
    return fs.readdirSync(this.#path).map(file => this.rel(file)).filter(f=>!excludesF(f));
  }

  ls(options?:DirectoryOptions) {
    const {fs,path}=this.#fs.deps;
    //if (!options) return fs.readdirSync(this.#path);
    return this.listFiles(options).map(f=>f.fixSep().name());
  }
  fixSep(){
    if (this.isDir()) {
      this.#path=addSep(this.#path);
    }
    return this;
  }

  mkdir() {
    const {fs,path}=this.#fs.deps;
    fs.mkdirSync(this.#path, { recursive: true });
    this.cache.clear();
    return this;
  }
  prepareDir(){
    const p=this.up();
    return p.exists() || p.mkdir();
  }
  contains(file:SFile) {
    return truncSep(file.path()).startsWith(truncSep(this.path()));
  }
  isLink():string|undefined {
    const {fs,path}=this.#fs.deps;
    if (!this.exists()) return undefined;
    const stat=fs.lstatSync(this.#path);
    if(!stat.isSymbolicLink())return undefined;
    return fs.realpathSync(this.#path);
  }
  link(to:SFile) {
    const {fs,path}=this.#fs.deps;
    fs.symlinkSync(to.path(), this.#path, "junction");
    this.cache.clear();
  }
  resolveLink() {
    const {fs,path}=this.#fs.deps;
    return this.clone(fs.realpathSync(this.#path));
  }
  watch(listener:(eventType:string, file:SFile, meta:MetaInfo)=>void):{remove:()=>void};
  watch(options:any, listener:(eventType:string, file:SFile, meta:MetaInfo)=>void):{remove:()=>void};
  watch(_1?:any, _2?:any) {
    let options={},listener:(eventType:string, file:SFile, meta:MetaInfo|undefined)=>void=function(){};
    if (typeof _1==="object") options=_1;
    if (typeof _2==="object") options=_2;
    if (typeof _1==="function") listener=_1;
    if (typeof _2==="function") listener=_2;
    const {fs,path}=this.#fs.deps;
    const watcher=fs.watch(this.#path, options,(eventType:string, filename:string|null) => {
      const file=filename? (
        this.#fs.deps.path.isAbsolute(filename) ? 
          this.clone(filename) : 
          this.rel(filename)
      ):this;
      listener(eventType, file,  file.exists() ? file.getMetaInfo() : undefined);
    });
    return {
      remove:()=>{
        watcher.close();
      }
    };
  }

}
