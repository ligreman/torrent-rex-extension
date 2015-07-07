//Logger
var DEBUG_MODE = false;
function logger(msg) {
    if (DEBUG_MODE) {
        console.log(msg);
    }
}

var constantes = {
    txibi: {
        urlCategories: 'http://trex-lovehinaesp.rhcloud.com/api/tx/categories',
        urlTorrents: 'http://trex-lovehinaesp.rhcloud.com/api/tx/torrents',
        urlSearch: 'http://trex-lovehinaesp.rhcloud.com/api/tx/search',
        urlDownload: 'http://trex-lovehinaesp.rhcloud.com/api/tx/download'
    },
    eztv: {
        urlCategories: 'http://trex-lovehinaesp.rhcloud.com/api/tx/categories',
        urlTorrents: 'http://trex-lovehinaesp.rhcloud.com/api/tx/torrents',
        urlSearch: 'http://trex-lovehinaesp.rhcloud.com/api/tx/search',
        urlDownload: 'http://trex-lovehinaesp.rhcloud.com/api/tx/download'
    }
};

function checkDownloads() {
    var status = (localStorage.getItem('trexStatus') === 'true'),
        series, newTorrents = [], url, datos, lastSerie;

    logger("Comienzo la comprobación de descargas");

    //Si está activo TRex
    if (status) {
        //Cojo las series y miro una a una
        series = JSON.parse(localStorage.getItem('series'));

        if (series === undefined || series === null || series.length === 0) {
            return null;
        }

        for (var i = 0; i < series.length; i++) {
            //Si no está activa esta serie me la salto
            if (!series[i].active) {
                continue;
            }

            logger("  Miro la serie: " + series[i].title);

            //Pido al ws la lista de torrents de la serie
            url = atob(series[i].url);
            var xmlhttp = new XMLHttpRequest();

            xmlhttp.onload = function () {
                logger("  El codigo de respuesta es: " + xmlhttp.readyState + " - " + xmlhttp.status);
                logger(xmlhttp);
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    var data = JSON.parse(xmlhttp.responseText);
                    datos = procesarTorrents(data.torrents);

                    logger("  Recibo respuesta OK");
                    logger(data);

                    //Comparo con los last de temporadas y capítulos descargados para saber si he de bajar algo nuevo
                    for (var j = 0; j < datos.seasons.length; j++) {
                        //Si están en la temporada última que he descargado o más avanzado sigo
                        if (datos.seasons[j].season >= series[i].lastSeason) {

                            //Miro cada capítulo de esta temporada
                            for (var k = 0; k < datos.seasons[j].chapters.length; k++) {
                                if (datos.seasons[j].chapters[k].chapter > series[i].lastChapter) {

                                    //Lo añado a la lista de descargas
                                    newTorrents.push({
                                        id: datos.seasons[j].chapters[k].id,
                                        title: datos.seasons[j].chapters[k].title
                                    });

                                    //Actualizo la variable de series
                                    series[i].lastChapter = datos.seasons[j].chapters[k].chapter;

                                }
                            }

                            //Actualizo la variable de temporada
                            series[i].lastSeason = datos.seasons[j].season;
                        }
                    }
                }
            };
            //Ha de ser síncrono, con el false, para que luego se ejecute lo siguiente
            xmlhttp.open("GET", constantes['txibi'].urlTorrents + '/' + series[i].url, false);
            xmlhttp.send();
        }

        //Cojo lo nuevo
        if (newTorrents !== null) {
            //Voy una a una bajando y generando notificación
            var notifications = JSON.parse(localStorage.getItem('notifications')),
                downloads = JSON.parse(localStorage.getItem('downloads')), j = 0;

            logger("  Lo nuevo es:");
            logger(newTorrents);

            if (notifications === undefined || notifications === null) {
                notifications = [];
            }
            if (downloads === undefined || downloads === null) {
                downloads = [];
            }

            for (i = 0, j = newTorrents.length; i < j; i++) {
                //Añado el torrent a la lista de descargas
                downloads.push({
                    torrent: constantes['txibi'].urlDownload + '/' + newTorrents[i].id,
                    title: newTorrents[i].title,
                    retry: 0
                });
            }
        }

        logger("  Añado a downloads");
        logger(downloads);

        //Actualizo localstorage
        localStorage.setItem('series', JSON.stringify(series));
        localStorage.setItem('downloads', JSON.stringify(downloads));

        //Lanzo la descarga de torrents
        processDownloads();
    }
}

//Listener de cuando salta la alarma
chrome.alarms.onAlarm.addListener(function (alarm) {
    logger("Salta la alarma");

    //Compruebo si hay cosas nuevas que descargar
    if (alarm.name === 'trex' || alarm.name === 'checkTrex') {
        checkDownloads();
    }

    //Descargo ficheros
    if (alarm.name === 'downloadTrex') {
        processDownloads();
    }

    //última comprobación
    var d = new Date();
    localStorage.setItem('lastCheck', formatTime(d.getHours()) + ':' + formatTime(d.getMinutes()));
    logger("Guardo la hora de comprobación: " + d.getHours() + ':' + d.getMinutes());
});

//Al iniciar navegador compruebo (le doy un minuto)
chrome.alarms.create('checkTrex', {
    delayInMinutes: 1
});

//Icono
var statusTrexIcon = (localStorage.getItem('trexStatus') === 'true');
if (statusTrexIcon) {
    chrome.browserAction.setIcon({path: 'images/activeIcon.png'});
}
statusTrexIcon = null; //Libero memoria

//Notificaciones
var notisTRexBadge = localStorage.getItem('notifications');
if (notisTRexBadge !== undefined && notisTRexBadge !== null) {
    notisTRexBadge = JSON.parse(notisTRexBadge);
    if (notisTRexBadge.length > 0) {
        chrome.browserAction.setBadgeText({
            text: "" + notisTRexBadge.length
        });
        chrome.browserAction.setBadgeBackgroundColor({
            color: '#1B5E20'
        });
    }
}
notisTRexBadge = null;

function procesarTorrents(listaTorrents) {
    var torrent, metadata, aux, ultimaTemporada = 0, temporadas = [], temporadaUltimoCapitulo = [],
        temps = [], chaps = [], idiomaGeneral = '';

    //Saco los excluidos
    var seriesActuales = JSON.parse(localStorage.getItem('series')), excluded = [];
    if (seriesActuales !== undefined && seriesActuales !== null && seriesActuales.length > 0) {
        //Busco la serie
        for (var i = 0; i < seriesActuales.length; i++) {
            for (var key2 in seriesActuales[i].excluded) {
                if (seriesActuales[i].excluded.hasOwnProperty(key2)) {
                    excluded.push(key2);
                }
            }
        }
    }

    //Recorro los torrents y voy extrayendo su metainformación
    for (var key in listaTorrents) {
        if (listaTorrents.hasOwnProperty(key)) {
            torrent = listaTorrents[key];

            //Miro a ver si está excluido
            if (excluded.indexOf(torrent.id) !== -1) {
                continue;
            }

            metadata = extractMetaInfo(torrent.title);

            if (metadata !== null) {

                //categoria
                aux = torrent.category.split(' > ');

                if (temporadas[metadata.temporada] === undefined) {
                    temporadas[metadata.temporada] = [];
                }

                temporadas[metadata.temporada][metadata.capitulo] = {
                    title: torrent.title,
                    id: torrent.id,
                    chapter: metadata.capitulo,
                    language: torrent.language,
                    languageTitle: metadata.idioma,
                    size: torrent.size,
                    format: metadata.formato
                };

                //Última temporada
                if (ultimaTemporada < metadata.temporada) {
                    ultimaTemporada = metadata.temporada;
                }

                //Último capítulo de la temporada
                if (temporadaUltimoCapitulo[metadata.temporada] === undefined || temporadaUltimoCapitulo[metadata.temporada] < metadata.capitulo) {
                    temporadaUltimoCapitulo[metadata.temporada] = metadata.capitulo;
                }

                //Idioma general
                if (idiomaGeneral === '') {
                    idiomaGeneral = metadata.idioma;
                }
            }
        }
    }


    for (var kk in temporadas) {
        chaps = [];

        if (temporadas.hasOwnProperty(kk)) {

            for (var jj in temporadas[kk]) {
                if (temporadas[kk].hasOwnProperty(jj)) {
                    chaps.push(temporadas[kk][jj]);
                }
            }

            temps.push({
                title: "Temporada " + kk,
                chapters: chaps,
                season: kk,
                lastChapter: temporadaUltimoCapitulo[kk]
            });
        }
    }

    return {
        lastSeason: ultimaTemporada,
        lastChapter: temporadaUltimoCapitulo[ultimaTemporada],
        language: idiomaGeneral,
        seasons: temps
    };
}


//Esta función extrae la temporada, el formato, idioma y el capítulo, del título de un torrent
function extractMetaInfo(torrentTitle) {
    var temporada = null, capitulo = null, formato = null, idioma = null;

    //La temporada
    var aux = torrentTitle.match(/Temporada ./gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        aux = aux.split(' ');
        aux = parseInt(aux[1]);

        //Compruebo que es un número de verdad
        if (!isNaN(aux)) {
            temporada = aux;
        }
    }

    //El capitulo
    aux = torrentTitle.match(/Cap\..../gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        //Verifico la temporada, por si antes no la pude sacar
        if (temporada === null) {
            var auxTemp = aux.charAt(aux.length - 3); //de Cap.103 es el 1
            auxTemp = parseInt(auxTemp);
            if (!isNaN(auxTemp)) {
                temporada = auxTemp;
            }
        }

        //Saco el capítulo
        var auxCap = aux.charAt(aux.length - 2) + aux.charAt(aux.length - 1); //de Cap.103 es el 03
        auxCap = parseInt(auxCap);
        if (!isNaN(auxCap)) {
            capitulo = auxCap;
        }
    }

    //El idioma
    aux = torrentTitle.match(/V.O.Sub.[A-Za-zñáéíóúÁÉÍÓÚ ]*/gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        idioma = aux;
    } else {
        aux = torrentTitle.match(/Español[A-Za-zñáéíóúÁÉÍÓÚ ]*/gi);
        if (aux !== undefined && aux !== null && aux !== '') {
            aux = aux[0];
            idioma = aux;
        }
    }

    //El formato
    aux = torrentTitle.match(/HDTV([A-Za-z0-9 ])*/gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        formato = aux;
    }

    if (temporada === null || capitulo === null) {
        return null;
    } else {
        return {
            temporada: temporada,
            capitulo: capitulo,
            idioma: idioma,
            formato: formato
        }
    }
}

function formatTime(tt) {
    tt = parseInt(tt);
    if (tt <= 9) {
        return '0' + tt;
    } else {
        return tt;
    }
}

//Descarga los torrents de la cola
function processDownloads() {
    var descargas = JSON.parse(localStorage.getItem('downloads')),
        notifications = JSON.parse(localStorage.getItem('notifications'));
    var final = descargas.length, contador = 0, correctos = [],
        timer = 0;

    if (notifications === undefined || notifications === null) {
        notifications = [];
    }

    descargas.forEach(function (torrent) {
        timer++;
        setTimeout(function () {
            downloadTorrent(torrent, function (resultado) {
                if (resultado) {
                    //Añado el torrent como descargado
                    correctos.push(torrent.torrent);

                    var m = new Date();
                    var dateString =
                        ("0" + m.getUTCDate()).slice(-2) + "/" +
                        ("0" + (m.getUTCMonth() + 1)).slice(-2) + "/" +
                        m.getUTCFullYear() + " " +
                        ("0" + m.getUTCHours()).slice(-2) + ":" +
                        ("0" + m.getUTCMinutes()).slice(-2) + ":" +
                        ("0" + m.getUTCSeconds()).slice(-2);

                    //Meto notificación
                    notifications.push({
                        text: torrent.title,
                        date: dateString
                    });
                }
                contador++;

                //Si ya he procesado todos, elimino los correctos
                if (contador === final) {
                    localStorage.setItem('notifications', JSON.stringify(notifications));

                    //Pongo numerito en el icono
                    if (notifications.length > 0) {
                        chrome.browserAction.setBadgeText({
                            text: "" + notifications.length
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: '#1B5E20'
                        });
                    }

                    downloadsRemoveOK(correctos);
                }
            });
        }, 2000 * timer);
    });
}

//Elimina de la cola de descargas los torrents descargados correctamente
function downloadsRemoveOK(correctos) {
    var descargas = JSON.parse(localStorage.getItem('downloads')),
        restantes = [];

    descargas.forEach(function (torrent) {
        //Si no encuentro el torrent en la lista de descargados correctamente lo mantengo
        if (correctos.indexOf(torrent.torrent) === -1) {
            torrent.retry++;
            restantes.push(torrent);
        }
    });

    //Al terminar guardo
    localStorage.setItem('downloads', JSON.stringify(restantes));
}

//Descarga un torrent
function downloadTorrent(torrent, callback) {
    chrome.downloads.download({
        url: torrent.torrent
    }, function (idDownload) {
        if (idDownload === undefined || idDownload.state === 'interrupted') {
            callback(false);
        } else {
            //Elimino de la lista de descargas el torrent -> usar callback
            callback(true);
        }
    });
}
