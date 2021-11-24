export function readInt24LE(buf: Buffer, offset: number): number {
    const tmp = buf.slice(offset, offset + 3);
    if (tmp.length < 3) {
        throw new Error('Buffer too small');
    }

    let ret = (tmp[0] & 0x0000ff) >>> 0;
    ret = (ret | ((tmp[1] << 8) & 0x00ff00)) >>> 0;
    ret = (ret | ((tmp[2] << 16) & 0xff0000)) >>> 0;
    if ((tmp[2] & 0x80) >>> 0 == 0x80) {
        ret = (ret | (0xff << 24)) >>> 0;
    }

    return ret;
}

export function readInt24BE(buf: Buffer, offset: number): number {
    const tmp = buf.slice(offset, offset + 3);
    if (tmp.length < 3) {
        throw new Error('Buffer too small');
    }

    let ret = (tmp[2] & 0x0000ff) >>> 0;
    ret = (ret | ((tmp[1] << 8) & 0x00ff00)) >>> 0;
    ret = (ret | ((tmp[0] << 16) & 0xff0000)) >>> 0;
    if ((tmp[0] & 0x80) >>> 0 == 0x80) {
        ret = (ret | (0xff << 24)) >>> 0;
    }

    return ret;
}
