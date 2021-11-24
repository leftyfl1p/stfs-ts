declare module 'windows-1252' {
    type EncodeOptions = {
        mode: 'fatal' | 'html';
    };
    type DecodeOptions = {
        mode: 'fatal' | 'replacement';
    };

    type Win1252 = {
        version: string;
        labels: string[];
        encode: (text: string, options?: EncodeOptions) => string;
        decode: (text: string, options?: DecodeOptions) => string;
    };

    const windows1252: Win1252;
    export default windows1252;
}
