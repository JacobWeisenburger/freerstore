console.log( 'Building...' )

try {
    await Deno.remove( 'dist', { recursive: true } )
} catch ( error ) { }
console.log( './dist: deleted' )

try {
    const command = new Deno.Command( 'cmd', { args: [ '/c', 'tsc' ] } )
    await command.output()
} catch ( error ) {
    console.group( 'Error:' )
    console.log( error )
    console.groupEnd()
}
console.log( 'tsc: ran' )

await Deno.copyFile( 'package.json', 'dist/package.json' )
console.log( 'package: copied' )

await Deno.copyFile( 'README.md', 'dist/README.md' )
console.log( 'README: copied' )

await Deno.copyFile( 'LICENSE', 'dist/LICENSE' )
console.log( 'LICENSE: copied' )

console.log( 'Build: done' )