export function getExeCtx () {
    return typeof process === 'undefined' ? 'browser' : 'server'
}