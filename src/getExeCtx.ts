export function getExeCtx () {
    return typeof process.env != undefined ? 'server' : 'browser'
}