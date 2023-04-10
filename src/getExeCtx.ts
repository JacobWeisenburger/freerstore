export function getExeCtx () {
    return typeof process.env != undefined ? 'node' : 'browser'
}