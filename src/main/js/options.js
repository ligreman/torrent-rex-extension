"use strict";
//ID google store: ccjildcogcgklkpedpomlbghfbikmeaa
var actualVersion = '2.2.2';

//Obtengo el localStorage
var datosSeries = localStorage.getItem('series'),
    datosDownloads = localStorage.getItem('downloads'),
    datosQuality = localStorage.getItem('quality'),
    schema = '{"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"array","items":{"id":"http://jsonschema.net/0","type":"object","properties":{"title":{"id":"http://jsonschema.net/0/title","type":"string"},"url":{"id":"http://jsonschema.net/0/url","type":"string"},"server":{"id":"http://jsonschema.net/0/server","type":"string"},"language":{"id":"http://jsonschema.net/0/language","type":"string"},"lastSeason":{"id":"http://jsonschema.net/0/lastSeason","type":"string"},"lastChapter":{"id":"http://jsonschema.net/0/lastChapter","type":"integer"},"excluded":{"id":"http://jsonschema.net/0/excluded","type":"object","properties":{"128862":{"id":"http://jsonschema.net/0/excluded/128862","type":"object","properties":{"title":{"id":"http://jsonschema.net/0/excluded/128862/title","type":"string"},"torrentId":{"id":"http://jsonschema.net/0/excluded/128862/torrentId","type":"string"}}}}},"active":{"id":"http://jsonschema.net/0/active","type":"boolean"}},"required":["title","url","server","language","lastSeason","lastChapter","excluded","active"]},"required":["0"]}';

if (datosSeries !== null) {
    document.getElementById('linkExportar').setAttribute('download', "TRex-backup-" + ahora() + ".txt");

    if (datosDownloads === null) {
        datosDownloads = '[]';
    }

    var hh = btoa(actualVersion) + ';' + btoa(datosSeries) + ';' + btoa(datosDownloads);

    var url = URL.createObjectURL(new Blob([hh], {type: 'text/plain'}));
    document.getElementById('linkExportar').setAttribute('href', url);
} else {
    document.getElementById('exportar').innerHTML = "No hay datos.";
}


//RADIO CAMBIO CALIDAD
if (datosQuality) {
    document.getElementById(datosQuality + 'Q').setAttribute('checked', 'checked');
}

document.getElementById('lowQ').onchange = function () {
    selectedRadio(this.value);
};
document.getElementById('highQ').onchange = function () {
    selectedRadio(this.value);
};

function selectedRadio(cual) {
    if (cual === 'low' || cual === 'high') {
        localStorage.setItem('quality', cual);
        datosQuality = cual;
    }
}

//IMPORTAR
document.getElementById('aImportar').addEventListener('change', handleFileSelect, false);

function handleFileSelect(evt) {
    var files = evt.target.files, error = '', todoBien = '';

    document.getElementById('importError').innerText = '';

    if (files.length > 1) {
        //console.log("No me metas mas....");
        error = 'Selecciona un solo fichero';
    } else {
        var f = files[0];
        //console.log(f);
        if (!f.type === 'text/plain' || f.size > 100000) { //dejo 100kB
            //console.log("Esto no me mola");
            error = 'El fichero seleccionado no es un fichero TRex';
        } else {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e) {

                    //console.log("El contenido es...");
                    //console.log(theFile);
                    //console.log(e);
                    var data = e.target.result;
                    var splitter = data.split(';'), dataSeries, dataDownloads, versionBackup = '';

                    try {
                        if (splitter.length === 3) {
                            // V 2.0
                            versionBackup = atob(splitter[0]);
                            dataSeries = atob(splitter[1]);
                            dataDownloads = atob(splitter[2]);
                        } else if (splitter.length === 2) {
                            //Backup nuevo V 1.2
                            dataSeries = atob(splitter[0]);
                            dataDownloads = atob(splitter[1]);
                            versionBackup = '1.1.1';
                        } else if (splitter.length === 1) {
                            //Backup antiguo V 1.0
                            dataSeries = atob(splitter[0]);
                            versionBackup = '1.0.0';
                        } else {
                            error = 'El contenido del fichero seleccionado no es correcto, puede haberse corrompido.';
                        }
                    } catch (err) {
                        error = 'El contenido del fichero seleccionado o no es un fichero TRex correcto o puede haberse corrompido.';
                    }

                    //console.log("Es " + tipoBackup);
                    //console.log(error);

                    //Intento validar el schema si no hubo error antes
                    if (error === '') {
                        //console.log("intento parsear");
                        //console.log(JSON.parse(dataSeries));
                        var valid = tv4.validate(JSON.parse(dataSeries), schema);

                        if (valid) {
                            //console.log("es valido");
                            localStorage.setItem('series', dataSeries);

                            if (versionBackup === '2.0.0') {
                                localStorage.setItem('downloads', dataDownloads);
                            }

                            if (versionBackup === '1.1.1') {
                                localStorage.setItem('downloads', dataDownloads);
                            }

                            //console.log("todo OK");
                            todoBien = 'Fichero TRex importado correctamente.';
                        } else {
                            error = 'El contenido del fichero seleccionado no es correcto, puede haberse corrompido.';
                        }
                    }

                    //Verifico si hubo algún tipo de error anterior tanto de parseo como de validación
                    if (error !== '') {
                        document.getElementById('importError').innerText = error;
                    } else {
                        document.getElementById('importOK').innerText = todoBien;
                    }
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsText(f);
        }
    }

    if (error !== '') {
        document.getElementById('importError').innerText = error;
    }
}


function ahora() {
    var fecha = new Date();

    var res = '', mes = (fecha.getMonth() + 1), dia = fecha.getDate();

    if (dia < 10) {
        res += '0' + dia;
    } else {
        res += dia;
    }

    if (mes < 10) {
        res += '0' + mes;
    } else {
        res += mes;
    }

    res += fecha.getFullYear();

    return res;
}
