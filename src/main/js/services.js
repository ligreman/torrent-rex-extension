var appServices = angular.module('appServices', []);

appServices.service('paramService', function () {
    var url = '', title = '', source = '', exclusionInfo, category = '',
        seasonLimits = {}, chapterLimits = {};

    var setUrl = function (newUrl) {
        url = newUrl
    };

    var getUrl = function () {
        return url;
    };

    var setTitle = function (newTitle) {
        title = newTitle
    };

    var getTitle = function () {
        return title;
    };

    var setSeasonLimits = function (min, max) {
        seasonLimits = {
            min: min,
            max: max
        }
    };

    var getSeasonLimits = function () {
        return seasonLimits;
    };

    var setChapterLimits = function (min, max) {
        chapterLimits = {
            min: min,
            max: max
        }
    };

    var getChapterLimits = function () {
        return chapterLimits;
    };

    var setSource = function (thissource) {
        source = thissource;
    };

    var getSource = function () {
        return source;
    };

    var setExclusionInfo = function (info) {
        exclusionInfo = info;
    };

    var getExclusionInfo = function () {
        return exclusionInfo;
    };

    var setCategory = function (cat) {
        category = cat;
    };

    var getCategory = function () {
        return category;
    };

    return {
        setUrl: setUrl,
        getUrl: getUrl,
        setTitle: setTitle,
        getTitle: getTitle,
        setSeasonLimits: setSeasonLimits,
        getSeasonLimits: getSeasonLimits,
        setChapterLimits: setChapterLimits,
        getChapterLimits: getChapterLimits,
        setSource: setSource,
        getSource: getSource,
        setExclusionInfo: setExclusionInfo,
        getExclusionInfo: getExclusionInfo,
        getCategory: getCategory,
        setCategory: setCategory
    };

});

appServices.service('torrentService', function () {
    var processTorrents = function processTorrents(listaTorrents) {
        var torrent, metadata, aux, ultimaTemporada = 0, temporadas = [], temporadaUltimoCapitulo = [],
            temps = [], chaps = [], idiomaGeneral = '';

        //Saco los excluidos
        var seriesActuales = JSON.parse(localStorage.getItem('series')), excluded = [];
        if (seriesActuales !== undefined && seriesActuales !== null && seriesActuales.length > 0) {
            //Busco la serie
            for (var i = 0; i < seriesActuales.length; i++) {
                for (var key in seriesActuales[i].excluded) {
                    if (seriesActuales[i].excluded.hasOwnProperty(key)) {
                        excluded.push(key);
                    }
                }
            }
        }

        //Recorro los torrents y voy extrayendo su metainformaci?n
        for (var key2 in listaTorrents) {
            if (listaTorrents.hasOwnProperty(key2)) {
                torrent = listaTorrents[key2];

                //Miro a ver si est? excluido
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
                        //category: aux[0],
                        size: torrent.size,
                        format: metadata.formato
                    };

                    //?ltima temporada
                    if (ultimaTemporada < metadata.temporada) {
                        ultimaTemporada = metadata.temporada;
                    }

                    //?ltimo cap?tulo de la temporada
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
    };

    return {
        processTorrents: processTorrents
    };
});

//Servicio de constantes para compartir
appServices.service('Constants', function () {
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

    var setConstant = function (key, value) {
        constantes[key] = value;
    };

    var getConstants = function () {
        return constantes;
    };

    return {
        set: setConstant,
        get: getConstants
    };
});

//Esta funci?n extrae la temporada, el formato, idioma y el cap?tulo, del t?tulo de un torrent
function extractMetaInfo(torrentTitle) {
    var temporada = null, capitulo = null, formato = null, idioma = null;

    //La temporada
    var aux = torrentTitle.match(/Temporada [0-9]{1,2}/gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        aux = aux.split(' ');
        aux = parseInt(aux[1]);

        //Compruebo que es un n?mero de verdad
        if (!isNaN(aux)) {
            temporada = aux;
        }
    }

    //El capitulo
    aux = torrentTitle.match(/Cap\.[0-9]{3,4}/gi);
    if (aux !== undefined && aux !== null && aux !== '') {
        aux = aux[0];
        aux = aux.replace('Cap.', '');

        //Verifico la temporada, por si antes no la pude sacar
        if (temporada === null) {
            var auxTemp;

            if (aux.length === 3) {
                auxTemp = aux.charAt(aux.length - 3); //de Cap.103 es el 1
            } else if (aux.length === 4) {
                auxTemp = '' + aux.charAt(aux.length - 4) + aux.charAt(aux.length - 3); //de Cap.1103 es el 11
            }

            auxTemp = parseInt(auxTemp);
            if (!isNaN(auxTemp)) {
                temporada = auxTemp;
            }
        }

        //Saco el cap?tulo
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
