//   LIBRERIAS
var express = require('express');
var servidor = express();
var path = require('path');

//--------------------------------------------------------------
//  CONFIGURACION DEL SERVIDOR


servidor.use(express.static(__dirname));

//codigo servidor
//---------------------------------------------------------------
servidor.use('/pagina_en_proceso/paginas', express.static(path.join(__dirname, 'public')))

servidor.post('/index', procesar_login);

servidor.get('/index', function(peticion, respuesta) {
  respuesta.sendFile(path.join(__dirname + "/paginas/index.html"));
});

servidor.get("/", function(peticion, respuesta) {

  respuesta.sendFile(path.join(__dirname + "/paginas/index.html"));
});

servidor.post('/cambioContrasenya', cambiarContrasenya);

servidor.get('/zona', getZona)

servidor.get('/sensores', getSensores)

servidor.post('/volverUsuarioActivo', turnUsuarioActivo);

//servidor.get('/lobby', procesarUsuario);
//BASE DATOS
var sqlite3 = require('sqlite3');
base_datos = new sqlite3.Database('base_datos.db', function(err) {
  if (err != null) {
    respuesta.sendStatus(503);
  }
});
//-----------------------------------------------------------------------------
//Procesar login
var objUsuario = {};

function procesar_login(peticion, respuesta) {
  function procesar_login2(err, row) {
    if (err != null) {
      respuesta.send('Error de base de datos: ' + err);
    } else {
      if (row === undefined) {
        objUsuario = {
          status: 404
        }; //No encontrado el usuario
        console.log('No existe')
        respuesta.send(objUsuario);

      } else {
        if (row.contrasenya == peticion.query.password) {
          objUsuario = {
            usuario: row,
            status: 200
          };
          respuesta.send(objUsuario);
          //Logueo exitoso

          //respuesta.sendStatus(200);
        } else {
          objUsuario = {
            status: 401
          }; //Inautorizado
          console.log('Mal')
          respuesta.send(objUsuario);
        } //else
      } //else
    } //else
  } //procesar_login2
  base_datos.get('SELECT * FROM usuarios WHERE email=?', [peticion.query.email], procesar_login2);

} //procesarLogin

//--------------------------------------------------------------------------------
// FUNCIÓN QUE SE EJECUTA AL "SUBMIT" LA NUEVA CONTRASEÑA
function cambiarContrasenya(peticion, respuesta) {

  base_datos.all('UPDATE usuarios SET contrasenya=? WHERE id=' + peticion.query.id, [peticion.query.contrasenya], function(err, row) {
    if (err != null) {
      respuesta.sendStatus(503);
    } else {
      respuesta.sendStatus(200);
    }
  });

}//cambiarContrasenya
//--------------------------------------------------------------------------------
//FUNCIÓN QUE DEVUELVE LAS ZONAS SEGÚN LA ID DE ZONA
function getZona(peticion, respuesta) {
  var objZona = {};
  var zona;
  var vertices;
  base_datos.get('SELECT * from Zona WHERE id=' + peticion.query.id, function(err, res) {
    if (err != null) {
      respuesta.sendStatus(500);
    } else {
      base_datos.all('SELECT * from Vertice WHERE zonaId=' + peticion.query.id, function(error, array) {
        if (error != null) {
          respuesta.sendStatus(500);
        } else {
         respuesta.send({
           zona: res,
           vertices: array
         })//send
        }//else
      }) //base_datos.all
    } //else
  })//base_datos.get
}//getZona
//----------------------------------------------------------------------------------
//FUNCIÓN QUE DEVUELVE LOS SENSORES DE LA BASE DE datos
function getSensores(peticion, respuesta) {
  base_datos.all('SELECT * FROM sensores', function(err,res){
    if(err != null) {
      respuesta.sendStatus(500);
    } else {
      respuesta.send(res);
    } //else
  }) //base_datos.all
}//getSensores

function turnUsuarioActivo(peticion, respuesta) {
  let id = peticion.query.id;
  base_datos.all('UPDATE Usuarios SET activo=1 WHERE id=?',[peticion.query.id], function(err){
    if(err!=null) {
      console.log('Vaya: '+ err);
    }
  });
}

servidor.listen(50971, function() {
  console.log('En marcha');
})
