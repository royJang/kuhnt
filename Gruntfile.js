module.exports = function (grunt){

    grunt.initConfig({
        nodewebkit: {
            options: {
                platforms: ['win64'],
                buildDir: './webkitbuilds', // Where the build version of my node-webkit app is saved
                credits: './bin/Credits.html',
                macIcns : './icon.icns'
            },
            src: ['./bin/**/*'] // Your node-webkit app
        }
    });

    grunt.loadNpmTasks('grunt-node-webkit-builder');

    grunt.registerTask('default', [
        'nodewebkit'
    ]);
};