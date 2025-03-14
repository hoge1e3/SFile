export type ContentBuffer=Buffer|ArrayBuffer;

export default class Content {
    static plainText(text:string, contentType?:string):Content;
    static url(url:string):Content;
    static bin(bin:ContentBuffer, contentType: string):Content;
    static isArrayBuffer(buf:ArrayBuffer|Buffer): buf is ArrayBuffer;
    static looksLikeDataURL(text:string):boolean;
    static setBufferPolyfill(b:typeof Buffer):void;
    static buffer2ArrayBuffer(buf:Buffer):ArrayBuffer;
    toURL():string;
    toBin(binType:typeof Buffer):Buffer;
    toBin(binType:typeof ArrayBuffer):ArrayBuffer;
    toBin():Buffer|ArrayBuffer;
    toArrayBuffer():ArrayBuffer;
    toNodeBuffer():Buffer;
    toPlainText():string;
    setBuffer(buffer:ContentBuffer):void;
    hasURL():boolean;
    hasBin():boolean;
    hasArrayBuffer():boolean;
    hasNodeBuffer():boolean;
    hasPlainText():boolean;
    toBlob():Blob;
    download(name:string):void;
    bufType: "node"|"array1"|"array2";
}
