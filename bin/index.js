var fs = require("fs");
var MODULE_PATH = require("path");

window.alert(2);

//阻止浏览器默认行。
$(document).on({
    dragleave:function(e){
        e.preventDefault();
    },
    drop:function(e){
        e.preventDefault();
    },
    dragenter:function(e){
        e.preventDefault();
    },
    dragover:function(e){
        e.preventDefault();
    }
});

var scenes = [];

var content = document.querySelector(".preview");
var template = document.getElementById( "template" ).text;

render();

function animate() {
    requestAnimationFrame( animate );
    render();
}

var defaultColor = 0xffffff;

function render() {
    scenes.forEach( function( scene ) {

        scene.userData.renderer.setClearColor( defaultColor );
        scene.userData.renderer.setScissorTest( false );
        scene.userData.renderer.clear();

        scene.userData.renderer.setClearColor( defaultColor );
        scene.userData.renderer.setScissorTest( true );

        scene.userData.renderer.render( scene, scene.userData.camera );
    });
}

function updateRendererColor ( color ){
    defaultColor = color;
    render();
}

function updateModelColor ( color ){
    scenes.forEach(function ( child ){
        child.userData.model3d.material.color.set( color );
    });
    render();
}

function createScene (){

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 50, 1, 1, 1000 );
    camera.position.z = 10;
    camera.lookAt(0,0,0);

    scene.userData.camera = camera;

    var cl = document.createElement("div");
    cl.classList.add("col-md-3");
    cl.classList.add("col-xs-3");
    cl.classList.add("list-item");
    cl.innerHTML = template;

    scene.userData.element = cl.querySelector(".scene");
    content.appendChild( cl );

    var controls = new THREE.OrbitControls( scene.userData.camera, scene.userData.element );
    controls.rotateSpeed = 1;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.addEventListener("change", render);
    scene.userData.controls = controls;

    var renderer = new THREE.WebGLRenderer({ canvas : scene.userData.element, antialias : true, preserveDrawingBuffer : true  });
    renderer.setPixelRatio( window.devicePixelRatio );
    scene.userData.renderer = renderer;

    scene.add( new THREE.HemisphereLight( 0xaaaaaa, 0x444444 ) );

    var light = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light.position.set( 1, 1, 1 );
    scene.add( light );
    scenes.push( scene );

    return {
        scene : scene,
        description : cl.querySelector(".description")
    }
}

document.getElementById("drop-area").addEventListener("drop", function ( e ){
    e.preventDefault();
    var fileList = e.dataTransfer.files;
    if( fileList.length == 0) return false;

    fileList = [].slice.call( fileList );

    //预览
    for( var i in fileList ){
        var $file = fileList[ i ];

        walk( $file.path, function ( data ){
            data.forEach(function ( path ){
                loadMesh( path );
            });
        });
    }
});

function loadMesh ( path ){
    if( /\.stl$/i.test( path ) ){
        loaderSTL( path );
    } else if( /\.obj$/i.test( path ) ) {
        loaderOBJ( path );
    }
}

function loaderSTL ( path ){
    var loader = new THREE.STLLoader();
    loader.load( path, function ( geometry ) {
        geometry.center();
        geometry.computeFaceNormals();

        var material = new THREE.MeshPhongMaterial( { color: 0x0099cc } );
        var mesh = new THREE.Mesh( geometry, material );

        appendToSendBox( mesh, path );
    });
}

function loaderOBJ ( $files ){
}

function centerMesh ( mesh ){
    mesh.position.set(0,0,0);
    mesh.rotation.set(0,0,0);
    mesh.up.set(0,1,0);

    //确定模型体积
    var box = new THREE.Box3().setFromObject( mesh );
    var size = box.size();

    //根据标准模型来缩放现有模型体积
    var scaling = (size.x / 92 + size.y / 93 + size.z / 33) / 3;
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 1 / scaling;
    //重新计算模型体积
    box = new THREE.Box3().setFromObject( mesh );
    size = box.size();

    var _scene = $(".scene"),
        _width = _scene.width(),
        _height = _scene.height();

    var mArea = ( _width * _height ) / ( size.y * size.x );

    //根据面积 和 标准面积再次缩放模型大小
    if( mArea < 300 ) {
        scaling /= mArea / 300;
        mesh.scale.x = mesh.scale.y = mesh.scale.z = 1 / scaling;
    }

    geometryOrigin(mesh).center();

    return mesh;
}

function appendToSendBox ( mesh, path ){
    var sendbox = createScene();
    mesh = centerMesh( mesh, sendbox );
    sendbox.scene.add( mesh );
    sendbox.scene.userData.model3d = mesh;
    var $path = MODULE_PATH.normalize( path.concat() );

    sendbox.description.innerHTML = $path.match(/(\w|[^\x00-\x7F]|)+\.(\w+)$/i)[0];
    sendbox.description.setAttribute("data-path", $path);
    render();
}

function geometryOrigin ( mesh ){
    if( mesh.geometry ){
        return mesh.geometry;
    } else if( mesh.children[0].geometry ){
        return mesh.children[0].geometry;
    }
}

function walk( path, callback ) {
    var fileList = [];
    walks( path );
    function walks( path ){
        var dirList = fs.readdirSync( path );
        dirList.forEach(function( item ){
            if(fs.statSync( path + '/' + item ).isDirectory()){
                walks( path + '/' + item );
            }else{
                fileList.push( path + '/' + item );
            }
        });
    }
    return callback( fileList );
}

//当更改背景颜色
$(".background-color").on("change", function ( e ){
    var c = $(this).val();
    updateRendererColor( c );
});

//模型颜色更改
$(".model-color").on("change", function (){
    var c = $(this).val();
    updateModelColor( c );
});

//清空预览列表
$(".screenClear").on("click", function (){
    scenes = [];
    $(".preview").html("");
    render();
});

var source = document.getElementById("source");

//点击截图
$(".screenShot").on("click", function (){
    $(".list-item").each(function (i, el){
        var cvs = $(el).find(".scene"),
            description = $(el).find(".description"),
            path = description.attr("data-path"),
            text = description.text(),
            name = text.replace(/\.stl|obj$/i, "");

        var base = path.replace(text, ""),
            type = $(".image-type").val();

        var output = base + name + "." + type;

        var shot_width = $(".shot-width").val(),
            shot_height = $(".shot-height").val();

        var re = type === "png" ? /^data:image\/png;base64,/ : /^data:image\/jpeg;base64/;

        cvs.each(function ( index, child ){

            var path = Canvas2Image.convertToImage( child, shot_width, shot_height, type ),
                $path = $(path).attr("src");

            var base64Data = $path.replace( re, "" ),
                binaryData = new Buffer(base64Data, 'base64').toString('binary');

            fs.writeFile( output, binaryData, "binary", function(err) {
                if( err ) return alert(JSON.stringify( err ));
            });
        });
    });
});
