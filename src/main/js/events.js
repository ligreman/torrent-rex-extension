"use strict";

//Logger
var DEBUG_MODE = true, version = '2.0.0';
function logger(msg) {
    if (DEBUG_MODE) {
        console.log(msg);
    }
}

//Check de versión
var localVersion = localStorage.getItem('version');
logger(localVersion);
if (localVersion !== null) {
    //Hago cosas de cambio de versiones
} else {
    localStorage.setItem('version', version);
}

var constantes = {
    trex: {
        urlSeries: 'http://trex-lovehinaesp.rhcloud.com/api/trex/series',
        urlSearch: 'http://trex-lovehinaesp.rhcloud.com/api/trex/search',
        urlDownloadTorrent: 'http://trex-lovehinaesp.rhcloud.com/api/trex/download'
        //urlSeries: 'http://localhost/api/trex/series',
        //urlSearch: 'http://localhost/api/trex/search',
        //urlDownloadTorrent: 'http://localhost/api/trex/download'
    }
};

function checkDownloads() {
    var status = (localStorage.getItem('trexStatus') === 'true'),
        series, newTorrents = [];

    logger("Comienzo la comprobación de descargas");

    //Si está activo TRex
    if (status) {
        //Cojo las series y miro una a una
        series = JSON.parse(localStorage.getItem('series'));

        if (series === undefined || series === null || series.length === 0) {
            return null;
        }

        series.forEach(function (serie, serieIndex) {
            //Si no está activa esta serie me la salto
            if (!serie.active) {
                return;
            }

            logger("  Miro la serie: " + serie.title);
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onload = function () {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    var data = JSON.parse(xmlhttp.responseText),
                        season, lastSeasonReal = serie.lastSeason, lastChapterReal = serie.lastChapter;

                    for (var seasonKey in data.torrents) {
                        if (data.torrents.hasOwnProperty(seasonKey)) {
                            season = data.torrents[seasonKey];
                            seasonKey = parseInt(seasonKey);

                            //Si están en la temporada última que he descargado o más avanzado sigo
                            if (seasonKey >= serie.lastSeason) {

                                //Recorro los capitulos de la sesión
                                season.forEach(function (thisChapter) {
                                    if (thisChapter.chapter > serie.lastChapter) {
                                        //Lo añado a la lista de descargas
                                        newTorrents.push({
                                            id: thisChapter.id,
                                            title: thisChapter.title,
                                            serie: serie.id
                                        });

                                        //Actualizo la variable de series
                                        //series[serieIndex].lastChapter = thisChapter.chapter;
                                        lastChapterReal = Math.max(thisChapter.chapter, lastChapterReal);
                                    }
                                });

                                //Actualizo la variable de temporada
                                //series[serieIndex].lastSeason = seasonKey;
                                lastSeasonReal = Math.max(seasonKey, lastSeasonReal);
                            }
                        }
                    }


                    //Actualizo la temporda y capitulo últimos
                    series[serieIndex].lastChapter = lastChapterReal;
                    series[serieIndex].lastSeason = lastSeasonReal;
                }
            };

            //Ha de ser síncrono, con el false, para que luego se ejecute lo siguiente
            xmlhttp.open("GET", constantes['trex'].urlSeries + '/' + serie.id, false);
            xmlhttp.send();

        });

        //Cojo lo nuevo
        if (newTorrents !== null) {
            //Voy una a una bajando y generando notificación
            var notifications = JSON.parse(localStorage.getItem('notifications')),
                downloads = JSON.parse(localStorage.getItem('downloads'));

            logger("  Lo nuevo es:");
            logger(newTorrents);

            if (notifications === undefined || notifications === null) {
                notifications = [];
            }
            if (downloads === undefined || downloads === null) {
                downloads = [];
            }

            for (var i = 0, j = newTorrents.length; i < j; i++) {
                //Añado el torrent a la lista de descargas
                downloads.push({
                    torrentId: newTorrents[i].id,
                    serieId: newTorrents[i].serie,
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

    localStorage.setItem('pendingCheck', false);
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
//chrome.alarms.create('checkTrex', {
//    delayInMinutes: 1
//});

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

    if (descargas === null) {
        descargas = [];
    }

    var final = descargas.length, contador = 0, correctos = [],
        timer = 0, max_downloads = 5;

    if (notifications === undefined || notifications === null) {
        notifications = [];
    }

    descargas.forEach(function (torrent) {
        timer++;

        logger('Descarga programada ' + timer);

        if (timer <= max_downloads) {
            setTimeout(function () {
                downloadTorrent(torrent, function (resultado) {
                    if (resultado) {
                        //Añado el torrent como descargado
                        correctos.push(torrent.torrentId);

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
                    if (contador === final || contador === max_downloads) {
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
        }
    });
}

//Elimina de la cola de descargas los torrents descargados correctamente
function downloadsRemoveOK(correctos) {
    var descargas = JSON.parse(localStorage.getItem('downloads')),
        restantes = [];

    descargas.forEach(function (torrent) {
        //Si no encuentro el torrent en la lista de descargados correctamente lo mantengo
        if (correctos.indexOf(torrent.torrentId) === -1) {
            torrent.retry++;
            restantes.push(torrent);
        }
    });

    //Al terminar guardo
    localStorage.setItem('downloads', JSON.stringify(restantes));

    //Si quedan restantes, programo otra descarga
    if (restantes.length > 0) {
        chrome.alarms.create('checkTrex', {
            delayInMinutes: 5
        });
    }
}

//Descarga un torrent
function downloadTorrent(torrent, callback) {
    chrome.downloads.download({
        url: constantes.trex.urlDownloadTorrent + '/' + torrent.serieId + '/' + torrent.torrentId
    }, function (idDownload) {
        if (idDownload === undefined || idDownload.state === 'interrupted') {
            callback(false);
        } else {
            //Elimino de la lista de descargas el torrent -> usar callback
            callback(true);
        }
    });
}
