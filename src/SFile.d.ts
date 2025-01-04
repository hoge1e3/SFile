import { default as Content } from "./Content.js";
import { MIMETypes } from "./MIMETypes.js";
export { default as Content } from "./Content.js";
type DependencyContainer = {
    fs: typeof import("node:fs");
    path: typeof import("node:path");
    Buffer: typeof Buffer;
};
export type MetaInfo = {
    lastUpdate: number;
    link?: string;
};
export type ExcludeFunction = (f: SFile) => boolean;
export type ExcludeHash = {
    [key: string]: any;
};
export type ExcludeOption = (ExcludeFunction | string[] | ExcludeHash);
export type DirectoryOptions = {
    excludes?: ExcludeOption;
    excludesF?: ExcludeFunction;
    includeDir?: boolean;
};
export type GetDirTreeExcludeFunction = (f: SFile, options: GetDirTreeExcludeFunctionArgs) => boolean;
export type GetDirStyle = "flat-absolute" | "flat-relative" | "hierarchical" | "no-recursive";
export type GetDirTreeOptions = {
    excludes?: ExcludeOption | GetDirTreeExcludeFunction;
    style: GetDirStyle;
    base?: SFile;
};
export type GetDirTreeExcludeFunctionArgs = {
    fullPath: string;
    relPath: string;
    style: GetDirStyle;
};
export type FileCallback = (f: SFile) => any;
export declare function getNodeFS(): Promise<FileSystemFactory>;
export declare class FileSystemFactory {
    deps: DependencyContainer;
    mimeTypes: MIMETypes;
    constructor(deps: DependencyContainer);
    addMIMEType(extension: string, contentType: string): void;
    _normalizePath(inputPath: string): string;
    get(inputPath: string): SFile;
}
export type Policy = {
    topDir: SFile;
};
export type DirTree = {
    [key: string]: MetaInfo | DirTree;
};
export declare class SFile {
    #private;
    static is(obj: any): obj is SFile;
    readonly _path: string;
    constructor(__fs: FileSystemFactory, filePath: string, policy?: Policy);
    setPolicy(p: Policy): SFile;
    clone(_path?: string): SFile;
    text(str: string): this;
    text(): string;
    lines(): string[];
    getText(): string;
    setText(str: string): this;
    appendText(str: string): void;
    getBlob(): Blob;
    setBlob(blob: Blob): Promise<ArrayBuffer>;
    obj(o: object): this;
    obj(): object;
    bytes(b: ArrayBuffer): this;
    bytes(b: Buffer): this;
    bytes(): Buffer;
    setBytes(b: ArrayBuffer | Buffer): ArrayBuffer | Buffer<ArrayBufferLike>;
    getBytes({ binType }?: {
        binType: (typeof Buffer | typeof ArrayBuffer);
    }): ArrayBuffer;
    dataURL(url: string): this;
    dataURL(): string;
    getMetaInfo(): MetaInfo;
    setMetaInfo(m: MetaInfo): void;
    size(): number;
    lastUpdate(): number;
    rm(options?: {
        r?: boolean;
        recursive?: boolean;
    }): this;
    exists(): boolean;
    isDir(): boolean;
    isDirPath(): boolean;
    path(): string;
    name(): string;
    ext(): string;
    truncExt(e: string): string;
    up(): SFile;
    sibling(name: string): SFile;
    relPath(base: SFile): string;
    rel(relPath: string): SFile;
    copyFrom(src: SFile): SFile;
    toString(): string;
    copyTo(dst: SFile, options?: {}): SFile;
    moveFrom(src: SFile): SFile;
    moveTo(dst: SFile): SFile;
    contentType(): string;
    isText(): RegExpMatchArray | null;
    getContent(): Content;
    setContent(c: Content): this;
    assertDir(): void;
    assertRegularFile(): void;
    parseExcludeOption(options?: DirectoryOptions): {
        excludesF: ExcludeFunction;
    };
    each(callback: (file: SFile) => void, options?: DirectoryOptions): this;
    recursive(): Generator<SFile>;
    recursive(options: DirectoryOptions): Generator<SFile>;
    recursive(callback: FileCallback, options: DirectoryOptions): this;
    getDirTree(options?: GetDirTreeOptions): DirTree;
    listFiles(options?: DirectoryOptions): SFile[];
    ls(options?: DirectoryOptions): string[];
    fixSep(): this;
    mkdir(): this;
    prepareDir(): true | SFile;
    contains(file: SFile): boolean;
    isLink(): string | null;
    link(to: SFile): void;
    resolveLink(): SFile;
    watch(listener: (eventType: string, file: SFile, meta: MetaInfo) => void): {
        remove: () => void;
    };
    watch(options: any, listener: (eventType: string, file: SFile, meta: MetaInfo) => void): {
        remove: () => void;
    };
}
