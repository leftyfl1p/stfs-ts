export function readInt24LE(buf: Buffer, offset: number): number {
    const tmp = buf.slice(offset, offset + 3);
    if (tmp.length < 3) {
        throw new Error('Buffer too small');
    }

    let ret: number = tmp[0] & 0x0000ff;
    ret |= (tmp[1] << 8) & 0x00ff00;
    ret |= (tmp[2] << 16) & 0xff0000;
    if ((tmp[2] & 0x80) == 0x80) {
        ret |= 0xff << 24;
    }

    return ret;
}

export function readInt24BE(buf: Buffer, offset: number): number {
    const tmp = buf.slice(offset, offset + 3);
    if (tmp.length < 3) {
        throw new Error('Buffer too small');
    }

    let ret = tmp[2] & 0x0000ff;
    ret |= (tmp[1] << 8) & 0x00ff00;
    ret |= (tmp[0] << 16) & 0xff0000;
    if ((tmp[0] & 0x80) == 0x80) {
        ret |= 0xff << 24;
    }

    return ret;
}
