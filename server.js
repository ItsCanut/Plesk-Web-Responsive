//   LIBRERIAS
var express = require('express');
var bodyParser = require('body-parser');
var servidor = express();
var path = require('path');
var nodemailer = require('nodemailer');
var puertoDefecto = 50971;
var transportista = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'softfields@gmail.com', // Your email id
    pass: 'dameLasPatatas' // Your password})

  }
});

//--------------------------------------------------------------
//  CONFIGURACION DEL SERVIDOR
////

servidor.use(express.static(__dirname));
servidor.use(bodyParser.json());
//codigo servidor
//---------------------------------------------------------------
servidor.use('/pagina_en_proceso/paginas', express.static(path.join(__dirname, 'public')))

servidor.post('/login', procesar_login);

servidor.get('/index', function(peticion, respuesta) {
  respuesta.sendFile(path.join(__dirname + "/paginas/index.html"));
});

servidor.get("/", function(peticion, respuesta) {

  respuesta.sendFile(path.join(__dirname + "/paginas/index.html"));
});

servidor.post('/cambioContrasenya', cambiarContrasenya);

servidor.get('/zona', getZonas)

servidor.get('/sensores', getSensores)

servidor.post('/volverUsuarioActivo', turnUsuarioActivo);

servidor.get('/recuperarContrasenya', enviarContrasenyaDeRecuperacion);

servidor.get('/getMedidas', getMedidas);

servidor.post('/cambioDatos', cambioDatos);

//servidor.get('/lobby', procesarUsuario);
//BASE DATOS
var sqlite3 = require('sqlite3');
base_datos = new sqlite3.Database('base_datos.db', function(err) {
  if (err != null) {
    console.log(err);
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

} //cambiarContrasenya

//--------------------------------------------------------------------------------
//FUNCIÓN QUE DEVUELVE LAS ZONAS SEGÚN LA ID DE ZONA
function getZonas(peticion, respuesta) {
  var objZonas = [{}];
  var ides = [];
  base_datos.all('SELECT nombre, color ,id FROM Zona where userID=' + peticion.query.id, function(err, traits) {
    if (err) {
      respuesta.sendStatus(500);
      console.log(err);
    } else {
      objZonas = traits

      for (let i = 0; i < traits.length; i++) {
        ides.push(traits[i].id); //Guardar las id's obtenidas de las zonas para buscar vertices
      } //for
      for (let i of objZonas) {
        i.vertices = [];
      } //for

      base_datos.all('SELECT lat,lng, orden, zonaId FROM Vertice WHERE zonaId IN(' + ides + ')',
        function(err2, vertex) {
          if (err2) {
            respuesta.sendStatus(404);
            console.log(err2);
          } else {

            for (let i = 0; i < objZonas.length; i++) {
              for (let k = 0; k < vertex.length; k++) {
                if (vertex[k].zonaId == objZonas[i].id) {
                  objZonas[i].vertices.push(vertex[k]);
                } //if
              } //for
            } //for
            respuesta.send(objZonas);

          } //else
        }); //base_datos.all

    } //else
  }) //base_datos.all
} //getZona

/* PENDIENTE DE REVISIÓN*/

//----------------------------------------------------------------------------------
//FUNCIÓN QUE DEVUELVE LOS SENSORES DE LA BASE DE datos
function getSensores(peticion, respuesta) {
  base_datos.all('SELECT * FROM sensores', function(err, res) {
    if (err != null) {
      respuesta.sendStatus(500);
    } else {
      respuesta.send(res);
    } //else
  }) //base_datos.all
} //getSensores

//------------------------------------------------------------------------------------
//FUNCIÓN PARA VOLVER UN USUARIO ACTIVO AL HABERSE LOGUEADO
function turnUsuarioActivo(peticion, respuesta) {
  base_datos.all('UPDATE Usuarios SET activo=1 WHERE id=?', [peticion.query.id], function(err) {
    if (err != null) {
      console.log('Vaya: ' + err);
    }
  });
}
//-----------------------------------------------------------------------------
//FUNCIÓN PARA RECIBIR UN ARRAY CON LAS MEDIDAS DE UNA MAGNITUD
function getMedidas(peticion, respuesta) {
  base_datos.all('SELECT tiempo FROM medidas', function(err1, tiempos) {
    if (err1) {
      respuesta.sendStatus(404);
    } else {
      base_datos.all('SELECT ' + peticion.query.magnitud + ' FROM medidas', function(err2, datos) {
        if (err2) {
          respuesta.sendStatus(404);
        } else {
          let response = {
            abcisa: tiempos,
            ordenada: datos
          } //response
          respuesta.send(response);
        } //else
      }) //base_datos.all
    } //else
  }) //base_datos.all
} //getMedidas
//------------------------------------------------------------------------------------
// FUNCIÓN PARA ENVIAR UNA CONTRASENYA DE RECUPERACION SI EL USUARIO LA HA PERDIDO
function enviarContrasenyaDeRecuperacion(peticion, respuesta) {
  var emailDestino = [peticion.query.email];
  let contrasenyaNueva = generarCodigo(6);


  let texto = "Tu nueva contraseña es: " + contrasenyaNueva;

  var mailOptions = {
    from: 'softfields@gmail.com', // sender address
    to: emailDestino, // list of receivers
    subject: 'Solicitud de nueva contrasenya', // Subject line
    text: texto
  }

  base_datos.all('SELECT * from Usuarios WHERE email=?', peticion.query.email, function(err, row) {
    if (err) {
      console.log('Error de base de datos: ' + err);
    } else {
      if (row === null || row === undefined || row.length == 0) {
        console.log('No existe nadie con el correo: ' + peticion.query.email)
      } else {
        base_datos.all("UPDATE Usuarios SET contrasenya='" + contrasenyaNueva + "' WHERE email='" + peticion.query.email + "';", function(err) {
          if (err) {
            console.log(err)
          } else {
            transportista.sendMail(mailOptions, function(error, info) {
              if (error) {
                console.log(error);
                respuesta.json({
                  yo: 'error'
                });
              } else {
                respuesta.json({
                  yo: info.response
                }); //json
              }; //else
            }); //sendMail
          } //else
        }); //transportista
      } //if
    } //if
  }) //comprobar que el usuario está en la base de datos

} //enviarContrasenyaDeRecuperacion
//-------------------------------------------------------------------------
function generarCodigo(longitud) {
  let caracteres = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
  ];

  let codigoArray = [];
  let codigo;

  for (let i = 0; i < longitud; i++) {
    codigoArray[i] = caracteres[numeroAleatorio(0, caracteres.length - 1)];
  }

  codigo = codigoArray.join("");
  return codigo
}

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
function cambioDatos(peticion, respuesta) {
  let datos = peticion.body
  let status = 200;
  let pregunta = 'UPDATE Usuarios SET ' + datos.aspectosCambiados[0] + "=" + "'" + datos.cambios[0] + "'" + ' WHERE id=' + datos.userID + ";"

  if (datos.aspectosCambiados[0] != undefined) {
    base_datos.all(pregunta, function(err) {
      if (err) {
        status = 500
      }
    })
  }

  if (datos.aspectosCambiados[1] != undefined) {
    base_datos.all('UPDATE Usuarios SET ' + datos.aspectosCambiados[1] + "=" + "'" + datos.cambios[1] + "'" + ' WHERE id=' + datos.userID + ";",
      function(err) {
        if (err) {
          status = 500
        }
      })
  }

  if (datos.aspectosCambiados[2] != undefined) {
    base_datos.all('UPDATE Usuarios SET ' + datos.aspectosCambiados[2] + "=" + "'" + datos.cambios[2] + "'" + ' WHERE id=' + datos.userID + ";",
      function(err) {
        if (err) {
          status = 500
        }
      })
  }

  setTimeout(function() {
    respuesta.sendStatus(status);
  }, 700);

}
//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
if (process.env.PORT !== undefined) {
  servidor.listen(process.env.PORT, function() {
    console.log('Escuchando en el puerto: ' + process.env.PORT)
  })
} else {
  servidor.listen(puertoDefecto, function() {
    console.log('En marcha en el puerto: ' + puertoDefecto);
  });
}
