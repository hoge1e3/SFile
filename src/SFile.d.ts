import { default as Content } from "./Content.js";
import { MIMETypes } from "./MIMETypes.js";
export { default as Content } from "./Content.js";
type DependencyContainer = {
    fs: typeof import("node:fs");
    path: typeof import("node:path");
    Buffer: typeof Buffer;
};
type BinTypeOption = {
    binType: typeof Buffer | typeof ArrayBuffer;
};
export type MetaInfo = {
    lastUpdate: number;
    link?: string;
    isDirPath?: boolean;
    stat?: import("node:fs").Stats;
    lstat?: import("node:fs").Stats;
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
export type ListFilesOptions = DirectoryOptions & {
    cacheMeta?: boolean;
};
export type RecursiveOptions = ListFilesOptions & {
    followlink?: boolean;
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
export declare class Cache<T> {
    private value;
    timestamp: number;
    set(v: Partial<T>): void;
    poke(v: Partial<T>): void;
    get(duration?: number): Partial<T>;
    valid(duration?: number): boolean;
    clear(): void;
}
export type CachedInfo = {
    meta: MetaInfo;
    content: Content;
};
export declare class SFile {
    #private;
    static is(obj: any): obj is SFile;
    readonly _path: string;
    cache: Cache<CachedInfo>;
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
    getBytes(options?: BinTypeOption): Buffer | ArrayBuffer;
    dataURL(url: string): this;
    dataURL(): string;
    getMetaInfo({ nofollow }?: {
        nofollow: boolean;
    }): MetaInfo;
    setMetaInfo(m: {
        lastUpdate: number;
    }): this;
    size(): number;
    lastUpdate(): number;
    rm(options?: {
        r?: boolean;
        recursive?: boolean;
    }): this;
    exists(): boolean;
    isDir({ nofollow }?: {
        nofollow: boolean;
    }): boolean;
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
    /**
     * src.copyTo(dst) is equivalent to cp src/* dst/* , not cp src dst
     * @param dst
     * @param options
     * @returns
     */
    copyTo(dst: SFile, options?: {
        followlink: boolean;
    }): SFile;
    moveFrom(src: SFile): SFile;
    moveTo(dst: SFile): SFile;
    contentType(): string;
    isText(): RegExpMatchArray | null;
    getContent(): Content;
    setContent(c: Content): this;
    assertDir(options?: {
        nofollow: boolean;
    }): void;
    assertRegularFile(options?: {
        nofollow: boolean;
    }): void;
    parseExcludeOption(options?: DirectoryOptions): {
        excludesF: ExcludeFunction;
    };
    each(callback: (file: SFile) => void, options?: DirectoryOptions): this;
    recursive(): Generator<SFile>;
    recursive(options: ListFilesOptions): Generator<SFile>;
    recursive(callback: FileCallback, options: ListFilesOptions): this;
    getDirTree(options?: GetDirTreeOptions): DirTree;
    /**
     *
     * @param options cacheMeta:
     *          If true, the metaInfo(result of .getMetaInfo()) of each file object is cached in the file object.
     *          If false, the metaInfo is retrieved each time from the file system when .getMetaInfo is called.
     *          true is more efficient but the metainfo is NOT changed even if the file is modified by other processes.
     * @returns
     */
    listFiles(options?: ListFilesOptions): SFile[];
    ls(options?: DirectoryOptions): string[];
    fixSep(): this;
    mkdir(): this;
    prepareDir(): true | SFile;
    contains(file: SFile): boolean;
    isLink(): string | undefined;
    link(to: SFile): void;
    resolveLink(): SFile;
    watch(listener: (eventType: string, file: SFile, meta: MetaInfo) => void): {
        remove: () => void;
    };
    watch(options: any, listener: (eventType: string, file: SFile, meta: MetaInfo) => void): {
        remove: () => void;
    };
}
