//"use strict";

var appControllers = angular.module('appControllers', []);

//Controlador de la vista inicial
appControllers.controller('MainCtrl', ['$scope', '$route', '$location', '$http', '$mdDialog', '$mdToast', 'paramService', 'Constants',
    function ($scope, $route, $location, $http, $mdDialog, $mdToast, paramService, Constants) {
        $scope.series = JSON.parse(localStorage.getItem('series'));
        $scope.trexStatus = (localStorage.getItem('trexStatus') === 'true');
        $scope.lastCheck = localStorage.getItem('lastCheck');
        $scope.errorTorrents = JSON.parse(localStorage.getItem('errores'));
        $scope.downloadingTorrents = JSON.parse(localStorage.getItem('downloads'));
        $scope.opcionesLink = chrome.extension.getURL('options.html');

        //Calidad por defecto
        var q = localStorage.getItem('quality');
        if (!q || (q !== 'low' && q !== 'high')) {
            localStorage.setItem('quality', 'low');
        }

        //Borro la lista de series
        Constants.set('series', null);

        $scope.changeTrexStatus = function () {
            localStorage.setItem('trexStatus', $scope.trexStatus);
            checkAlarms();

            if ($scope.trexStatus) {
                chrome.browserAction.setIcon({path: 'images/activeIcon.png'});
            } else {
                chrome.browserAction.setIcon({path: 'images/defaultIcon38x38.png'});
            }
        };

        //Actualizar las series ya que he cambiado el status de alguna
        $scope.updateSeries = function () {
            localStorage.setItem('series', JSON.stringify($scope.series));
        };

        /*
         patron: /(.*) - (Temp\.|Temporada )([0-9]+) \[([A-Z]+)\]\[([a-zA-Z\.0-9]+)\]\[(.+)\]/
         title: Homeland - Temp.1 [HDTV][Cap.112 FINAL][Espa�ol Castellano]

         */

        //Quitar una serie
        $scope.removeSerie = function (ev, serieTitle) {
            var confirm = $mdDialog.confirm()
                .title('¿Eliminar descarga?')
                .content('Se dejará de descargar ' + serieTitle + '.')
                .ariaLabel('')
                .ok('Aceptar')
                .cancel('Cancelar')
                .targetEvent(ev);
            $mdDialog.show(confirm).then(function () {
                var auxSeries = JSON.parse(localStorage.getItem('series'));

                for (var i = 0; i < auxSeries.length; i++) {
                    if (auxSeries[i].title == serieTitle) {
                        auxSeries.splice(i, 1);
                        break;
                    }
                }

                $scope.series = auxSeries;
                localStorage.setItem('series', JSON.stringify($scope.series));
            }, function () {
            });
        };

        //Lanzo un chequeo en 1 minuto
        $scope.checkDownloadsNow = function () {
            var chequeoPendiente = (localStorage.getItem('pendingCheck') === 'true');

            if (!chequeoPendiente) {
                chrome.alarms.create('checkTrex', {
                    delayInMinutes: 1
                });
                localStorage.setItem('pendingCheck', true);
                $mdToast.show(
                    $mdToast.simple()
                        .content('Comprobación en 1 minuto')
                        .position('bottom right')
                        .hideDelay(3000)
                );
            }
        };

        //Alarmas
        checkAlarms();

        //Notificaciones
        checkNotifications();

        //Go a una serie
        $scope.goToSerie = function (param, name, category, source, quien) {
            paramService.setId(param); //serie id
            paramService.setTitle(name); //serie name
            paramService.setSource('custom');
            paramService.setLastPage(quien);
            paramService.setCategory(category);
            $location.path('/chapters');
        };

        //GoTo
        $scope.goto = function (path) {
            $location.path('/' + path);
        };

        //Exclusiones
        $scope.showExclusions = function (ev, serie) {
            var auxSeries = $scope.series;

            for (var i = 0; i < auxSeries.length; i++) {
                if (auxSeries[i].title == serie) {
                    paramService.setExclusionInfo(auxSeries[i].excluded);
                    paramService.setTitle(auxSeries[i].title);
                    $mdDialog.show({
                        controller: ExcludeDialogController,
                        templateUrl: 'views/templates/excludeDialog.tmpl.html',
                        targetEvent: ev
                    }).then(function (answer) {
                        if (answer > 0) {
                            $route.reload();
                        }
                    }, function () {
                    });
                }
            }
        };

        //Contar exclusiones
        $scope.countExcluded = function (exclusions) {
            return Object.keys(exclusions).length;
        };

        //Muestro el diálogo de la lista de descarga
        $scope.showDownloadPile = function (ev) {
            $mdDialog.show({
                controller: DownloadsDialogController,
                templateUrl: 'views/templates/downloadsDialog.tmpl.html',
                targetEvent: ev
            }).then(function (answer) {
            }, function () {
            });
        };

        //Dialogo de cambio de episodio y temporada
        $scope.showChangeData = function (ev, serie) {
            paramService.setSource(serie);
            $mdDialog.show({
                controller: ChangeDataDialogController,
                templateUrl: 'views/templates/changeDataDialog.tmpl.html',
                targetEvent: ev
            }).then(function (answer) {
                if (answer > 0) {
                    $route.reload();
                }
            }, function () {
            });
        };

        //About
        $scope.about = function (ev) {
            $mdDialog.show(
                $mdDialog.alert()
                    .title('Acerca de Torrent Rex')
                    .content('Torrent Rex comprobará al arrancar el navegador, al activarse y cada hora (siempre que esté activo) si existen nuevos episodios de tus series favoritas, descargando automáticamente los torrents a la carpeta de Descargas predefinida en tu navegador.')
                    .ariaLabel('')
                    .ok('¡Me mola!')
                    .targetEvent(ev)
            );
        };

        //Converter
        $scope.convertSource = function (fuente) {
            "use strict";
            switch (fuente) {
                case 'N':
                case 'SN':
                    return 'NP';
                    break;
                case 'N1':
                case 'SN1':
                    return 'NP1';
                    break;
                case 'T':
                    return 'TXB';
                    break;
            }
        };
    }]);

//Controlador de la vista de lista de series
appControllers.controller('SeriesCtrl', ['$scope', '$location', '$http', 'paramService', 'Constants',
    function ($scope, $location, $http, paramService, Constants) {
        var constantes = Constants.get();
        //$scope.loading = true;
        $scope.serverCount = 0;
        $scope.selectedServer = 0;
        $scope.error500 = false;

        //Si ya tengo categorías cargando no consulto al webservice
        /*if (constantes.series === undefined || constantes.series === null) {
         //Consulto el WS para obtener las categorï¿½as
         /!*$http.get(constantes.trex.urlSeries).
         success(function (data) {
         $scope.servers = data.servers;
         $scope.loading = false;
         Constants.set('series', data.servers);
         });*!/

         $http({
         method: 'GET',
         url: constantes.trex.urlSeries
         }).then(function successCallback(response) {
         console.log(response);
         $scope.servers = response.data.servers;
         $scope.loading = false;
         $scope.error500 = false;
         Constants.set('series', response.data.servers);
         }, function errorCallback(response) {
         $scope.loading = false;
         $scope.error500 = true;
         });
         } else {
         $scope.servers = constantes.series;
         $scope.loading = false;

         http://www.newpct.com/descargar-serie/gotham/capitulo-211/
         }*/

        $scope.errorUrl = null;
        //Función que valida la url de la serie a buscar
        $scope.searchSerie = function (url) {
            $scope.errorUrl = null;

            var patt_A = /(http:\/\/www.[a-z]+.com\/)(descargar-serie(hd|vo)?|todos-los-capitulos\/series)\/([A-Za-z0-9]+)/g,
                patt1  = /http:\/\/www\.[a-z1]+\.com\/series\/([a-zA-Z0-9-\.]+)\//;

            var resA = patt_A.exec(url.serieUrl),
                res1 = patt1.exec(url.serieUrl);

            var serie = '', clase = '', serieUrl = '';

            if (resA !== null) {
                serie = resA[4].trim();
                // Elimino el dominio
                serieUrl = url.serieUrl.replace(resA[1], '');
            } else if (res1 !== null) {
                serie = res1[1].trim();
                clase = '1';
            }


            if (serie !== '') {
                var namecito = capitalize(serie);

                $scope.goto('chapters', serieUrl, namecito, 'SD', 'N' + clase)
            } else {
                $scope.errorUrl = 'Introduce una url válida';
            }
        };

        //GoTo
        $scope.goto = function (path, param, name, category, source) {
            paramService.setId(param);
            paramService.setTitle(name);
            paramService.setSource(source);
            paramService.setLastPage('series');
            paramService.setCategory(category);
            $location.path('/' + path);
        };
    }]);


//Controlador de la vista de Añadir series - Capítulos �
appControllers.controller('ChaptersCtrl', ['$scope', '$location', '$http', '$mdDialog', '$mdToast', 'paramService', 'torrentService', 'Constants',
    function ($scope, $location, $http, $mdDialog, $mdToast, paramService, torrentService, Constants) {
        var constantes = Constants.get();

        $scope.loading = true;
        $scope.info = null;
        $scope.chapLimits = null;

        $scope.fromSeason = 0;
        $scope.fromChapter = 0;

        //ID y título de la serie. El título no tiene metainformación
        $scope.urlSerie = paramService.getId();
        $scope.category = paramService.getCategory();
        $scope.title = paramService.getTitle();
        $scope.lastPage = paramService.getLastPage();
        $scope.source = paramService.getSource(); //T o N dependiendo del servidor elegido

        //Toasts
        $scope.toastPosition = {bottom: true, top: false, left: false, right: true};
        $scope.getToastPosition = function () {
            return Object.keys($scope.toastPosition).filter(function (pos) {
                return $scope.toastPosition[pos];
            }).join(' ');
        };
        $scope.showSimpleToast = function (msg) {
            $mdToast.show(
                $mdToast.simple()
                    .content(msg)
                    .position($scope.getToastPosition())
                    .hideDelay(3000)
            );
        };

        var enlace = '';
        /*, quality = localStorage.getItem('quality');
         if (!quality || (quality !== 'low' && quality !== 'high')) {
         quality = 'low';
         }*/

        if ($scope.source === 'N' || $scope.source === 'N1') {
            enlace = constantes.trex.urlAddSerie + '/' + $scope.source + '/' + btoa($scope.urlSerie) + '/' + btoa($scope.title);
        } else {
            // En este caso en urlSerie viene el id
            enlace = constantes.trex.urlGetSerie + '/' + $scope.urlSerie;
        }

        $http({
            method: 'GET',
            url: enlace
        }).then(function successCallback(response) {
            $scope.loading = false;
            $scope.info = torrentService.processTorrents(response.data);
            $scope.idSerie = $scope.info.idSerie;
        }, function errorCallback(response) {
        });

        //Descarga de un torrent
        $scope.download = function (torrentId) {
            downloadTorrent(constantes['trex'].urlDownloadTorrent + '/' + torrentId);
        };


        //Comprueba si un torrent está excluido
        $scope.isExcluded = function (id) {
            var seriesActuales = JSON.parse(localStorage.getItem('series')), excluded = false;
            if (seriesActuales !== undefined && seriesActuales !== null && seriesActuales.length > 0) {
                //Busco la serie
                for (var i = 0; i < seriesActuales.length; i++) {
                    if (seriesActuales[i].title == $scope.title && seriesActuales[i].excluded[id] !== undefined) {
                        excluded = true;
                    }
                }
            }
            return excluded;
        };

        //Excluye un torrent de la descarga de esta serie (tiene que estar añadida antes)
        $scope.excludeTorrent = function (id, capiTitle, ev) {
            var seriesActuales = JSON.parse(localStorage.getItem('series')), error = false, encontrado = false;

            if (seriesActuales !== undefined && seriesActuales !== null && seriesActuales.length > 0) {
                //Busco la serie
                for (var i = 0; i < seriesActuales.length; i++) {
                    if (seriesActuales[i].title == $scope.title) {
                        //Esta es la serie, añado a la lista de exclusiones este torrent
                        seriesActuales[i].excluded[id] = {title: capiTitle, torrentId: id};
                        encontrado = true;
                        break;
                    }
                }

                if (encontrado) {
                    localStorage.setItem('series', JSON.stringify(seriesActuales));
                    $scope.showSimpleToast('Episodio excluido.');
                }
            } else {
                error = true;
            }

            if (error || !encontrado) {
                $mdDialog.show(
                    $mdDialog.alert()
                        .title('No se pudo excluir')
                        .content('Antes de excluir un episodio has de añadir la serie a las descargas automáticas. Después ya puedes excluir manualmente los episodios que quieras.')
                        .ariaLabel('')
                        .ok('De acuerdo')
                        .targetEvent(ev)
                );
            }
        };

        //Incluye un torrent a las descargas, previamente exluido
        $scope.desExcludeTorrent = function (id, ev) {
            desexcluir($scope, id, true);
        };

        //Añadir una descarga - diálogo
        $scope.showAdd = function (ev) {
            if ($scope.info === null) {
                return null;
            }

            //Limites de capítulos por temporada
            $scope.chapLimits = [];
            for (var k in $scope.info.seasons) {
                if ($scope.info.seasons.hasOwnProperty(k)) {
                    var tempo = $scope.info.seasons[k];
                    $scope.chapLimits[tempo.season] = tempo.lastChapter;
                }
            }

            paramService.setSeasonLimits(1, $scope.info.lastSeason);
            paramService.setChapterLimits(1, $scope.chapLimits);

            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'views/templates/addDialog.tmpl.html',
                targetEvent: ev
            }).then(function (answer) {
                addSerieDownload($scope, answer);
            }, function () {
            });
        };

        //Añadir directamente
        $scope.addDirectly = function (id, answer) {
            addSerieDownload($scope, answer);
        };

        //GoTo
        $scope.goto = function (path) {
            $location.path('/' + path);
        };
    }]);


/*********** CONTROLADORES DE DIÁLOGOS ****************/

function DialogController($scope, $mdDialog, paramService) {
    $scope.seasonLimits = paramService.getSeasonLimits();
    $scope.chapterLimits = paramService.getChapterLimits();

    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
    $scope.answer = function (answer) {
        $mdDialog.hide(answer);
    };
}

function DownloadsDialogController($scope, $mdDialog, $mdToast) {
    $scope.downloads = JSON.parse(localStorage.getItem('downloads'));

    $scope.hide = function () {
        $mdDialog.hide($scope.cambios);
    };
    $scope.downloadTorrents = function () {
        //Creo un alarm para intentar descargar
        chrome.alarms.create('downloadTrex', {
            delayInMinutes: 1
        });

        //Toasts
        $mdToast.show(
            $mdToast.simple()
                .content('Los torrents se intentarán descargar dentro de 1 minuto')
                .position('bottom')
                .hideDelay(3000)
        );
    };
}

function ExcludeDialogController($scope, $mdDialog, paramService) {
    $scope.exclusions = paramService.getExclusionInfo();
    $scope.title = paramService.getTitle();
    $scope.cambios = 0;

    $scope.hide = function () {
        $mdDialog.hide($scope.cambios);
    };
    $scope.ok = function () {
        $mdDialog.hide($scope.cambios);
    };

    $scope.incluir = function (id) {
        desexcluir($scope, id, false);
        if ($scope.exclusions[id] !== undefined) {
            $scope.cambios++;
            delete $scope.exclusions[id];
        }
    };
}

function ChangeDataDialogController($scope, $mdDialog, paramService) {
    $scope.serie = paramService.getSource();
    $scope.cambios = 0;
    $scope.fromSeason = parseInt($scope.serie.lastSeason);
    $scope.fromChapter = parseInt($scope.serie.lastChapter);

    $scope.hide = function () {
        $mdDialog.hide($scope.cambios);
    };
    $scope.ok = function (res) {
        updateSerieData(res, $scope.serie.title);
        $scope.cambios++;
        $mdDialog.hide($scope.cambios);
    };
}

/*********** FUNCIONES AUXILIARES ****************/

function updateSerieData(newSerie, titulo) {
    var newSesion, newChapter,
        series = JSON.parse(localStorage.getItem('series'));

    newSesion = parseInt(newSerie.fromTemporada);
    newChapter = parseInt(newSerie.fromEpisodio);

    series.forEach(function (serie, index, array) {
        if (serie.title === titulo) {
            if (!isNaN(newSesion)) {
                series[index].lastSeason = newSesion;
            }

            if (!isNaN(newChapter)) {
                series[index].lastChapter = newChapter;
            }
        }
    });

    localStorage.setItem('series', JSON.stringify(series));
    return true;
}

//Añade series a descarga
function addSerieDownload($scope, answer) {
    //La añado a las ya existentes
    var yaExiste     = false,
        actualSeries = JSON.parse(localStorage.getItem('series'));

    if (actualSeries === null || actualSeries === undefined) {
        actualSeries = [];
    }

    //Compruebo que la serie no está ya añadida
    for (var i = 0; i < actualSeries.length; i++) {
        //if (actualSeries[i].title === $scope.title && actualSeries[i].category === $scope.category) {
        if (actualSeries[i].title === $scope.title && actualSeries[i].category === $scope.category) {
            //Error serie ya existe
            $scope.showSimpleToast('La serie ya está descargándose.');
            yaExiste = true;
        }
    }
    if (!yaExiste) {
        //Resto 1 porque así bajo el que me ha indicado el usuario
        var epi = parseInt(answer.fromEpisodio) - 1;

        //Añado los datos
        actualSeries.push({
            id: $scope.idSerie,
            title: $scope.title,
            url: $scope.url,
            source: $scope.source,
            category: $scope.category,
            language: $scope.info.language,
            lastSeason: parseInt(answer.fromTemporada),
            lastChapter: epi,
            excluded: {},
            active: true
        });

        //Actualizo el storage
        chrome.storage.local.set({'series': actualSeries}, function () {
            //Todo ok
            $scope.showSimpleToast('Serie añadida correctamente.');
        });
        localStorage.setItem('series', JSON.stringify(actualSeries));
    }
}

function checkAlarms() {
    var status = (localStorage.getItem('trexStatus') === 'true');

    //chrome.alarms.getAll(function(alarms){console.log(alarms);});

    if (status) {
        //Miro a ver si existe ya la alarma
        chrome.alarms.get('trex', function (alarm) {
            if (alarm === undefined) {
                //La creo. Como va con nombre no hay problema de duplicados
                chrome.alarms.create('trex', {
                    delayInMinutes: 1,
                    periodInMinutes: 60
                });
                localStorage.setItem('pendingCheck', true);
            }
        });
    } else {
        //Desactivo alarmas
        chrome.alarms.clear('trex');
    }
}

function checkNotifications() {
    var notis = JSON.parse(localStorage.getItem('notifications'));

    if (notis !== undefined && notis !== null && notis.length > 0) {
        for (var i = 0; i < notis.length; i++) {
            chrome.notifications.create('', {
                type: "basic",
                title: "TRex - " + notis[i].date,
                message: notis[i].text,
                iconUrl: "images/downloaded.png"
            }, function (nid) {
            });
        }

        //Limpio las notificaciones ya mostradas
        localStorage.setItem('notifications', JSON.stringify([]));
        chrome.browserAction.setBadgeText({
            text: ""
        });
    }
}

function desexcluir($scope, id, showMsg) {
    var seriesActuales = JSON.parse(localStorage.getItem('series')), error = false, encontrado = false;
    if (seriesActuales !== undefined && seriesActuales !== null && seriesActuales.length > 0) {
        //Busco la serie
        for (var i = 0; i < seriesActuales.length; i++) {
            if (seriesActuales[i].title == $scope.title) {
                //Esta es la serie, aï¿½ado a la lista de exclusiones este torrent
                if (seriesActuales[i].excluded[id] !== undefined) {
                    delete seriesActuales[i].excluded[id];
                }

                //var index = seriesActuales[i].excluded.indexOf(id);
                //seriesActuales[i].excluded.splice(index, 1);
                localStorage.setItem('series', JSON.stringify(seriesActuales));
                if (showMsg) {
                    $scope.showSimpleToast('Episodio incluido de nuevo.');
                }
                break;
            }
        }
    } else {
        if (showMsg) {
            $scope.showSimpleToast('La serie no está en descarga actualmente.');
        }
    }
}

//*****************************************************************//
//*****************************************************************//
//*****************************************************************//
//Controlador de la vista de buscar torrents
appControllers.controller('TorrentsCtrl', ['$scope', '$location', '$http', 'Constants',
    function ($scope, $location, $http, Constants) {
        var constantes = Constants.get();

        $scope.loading = false;
        $scope.currentPage = 0;
        $scope.maxPages = 0;
        $scope.searchTerm = '';

        $scope.search = function (term, page) {
            $scope.loading = true;
            $scope.currentPage = 0;
            $scope.maxPages = 0;

            //Consulto el WS para obtener las categorías
            /*$http.get(constantes['trex'].urlSearch + '/' + btoa(term) + '/' + page).
             success(function (data) {
             $scope.torrents = data.torrents;
             $scope.loading = false;

             $scope.maxPages = data.maxPages;
             $scope.currentPage = page;
             });*/

            $http({
                method: 'GET',
                url: constantes['trex'].urlSearch + '/' + btoa(term) + '/' + page
            }).then(function successCallback(response) {
                $scope.torrents = response.data.torrents;
                $scope.loading = false;

                $scope.maxPages = response.data.maxPages;
                $scope.currentPage = page;
            }, function errorCallback(response) {
            });
        };

        //Descarga de un torrent
        $scope.download = function (torrentId) {
            downloadTorrent(constantes['trex'].urlDownloadTorrent + '/' + torrentId);
        };

        //GoTo
        $scope.goto = function (path) {
            $location.path('/' + path);
        };
    }]);


function downloadTorrent(urlTorrent) {
    chrome.downloads.download({
        url: urlTorrent
    }, function (idDownload) {
    });
}

function capitalize(name) {
    name = normalizeName(name);
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function normalizeName(name) {
    return name.toLowerCase().replace(/-(.)/g, function (match, group1) {
        return ' ' + group1.toUpperCase();
    });
}
