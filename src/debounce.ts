export function debounce<Args extends any[]> (
    delayMS: number,
    func: ( ...args: Args ) => any
) {
    let timer: NodeJS.Timeout | undefined
    return ( ...args: Args ) => {
        clearTimeout( timer )
        timer = setTimeout( () => { func( ...args ) }, delayMS )
    }
}