"use strict";

var appServices = angular.module('appServices', []);

appServices.service('paramService', function () {
    var id = '', url = '', title = '', source = '', exclusionInfo, category = '',
        seasonLimits = {}, chapterLimits = {}, lastPage = '';

    var setId = function (newId) {
        id = newId
    };

    var getId = function () {
        return id;
    };

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

    var setLastPage = function (lastP) {
        lastPage = lastP;
    };

    var getLastPage = function () {
        return lastPage;
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
        setId: setId,
        getId: getId,
        setUrl: setUrl,
        getUrl: getUrl,
        getLastPage: getLastPage,
        setLastPage: setLastPage,
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
    var processTorrents = function processTorrents(data) {
        var seasonChapters, metadata, aux,
            ultimaTemporada = 0, temporadas = [],
            temps = [], chaps = [], idiomaGeneral = '',
            listaTorrents = data.torrents;

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

        //Los metadatos de la serie
        metadata = data.metadata;
        var idSerie = data.id;

        //Recorro los torrents y voy extrayendo su metainformación
        for (var season in listaTorrents) {
            if (listaTorrents.hasOwnProperty(season)) {
                seasonChapters = listaTorrents[season];

                seasonChapters.forEach(function (chapter) {
                    console.log("Chapter:");
                    console.log(chapter);
                    //Miro a ver si está excluido
                    if (excluded.indexOf(chapter._id) === -1) {
                        //Genero la lista de capítulos de esta temporada
                        if (temporadas[season] === undefined) {
                            temporadas[season] = [];
                        }

                        temporadas[season][chapter.chapter] = {
                            title: chapter.title,
                            id: chapter._id,
                            torrentId: chapter.torrentId,
                            chapter: chapter.chapter,
                            language: chapter.language,
                            size: chapter.size,
                            format: chapter.format
                        };

                        //Idioma general
                        if (idiomaGeneral === '') {
                            idiomaGeneral = chapter.language;
                        }
                    }
                });
            }
        }

        // Creo el objeto de temporadas
        temporadas.forEach(function (kk, index) {
            chaps = [];

            temporadas[index].forEach(function (jj, index2) {
                chaps.push(temporadas[index][index2]);
            });

            temps.push({
                title: "Temporada " + index,
                chapters: chaps,
                season: index,
                lastChapter: metadata.seasonsDetail[index].lastChapter
            });
        });

        var ulti = metadata.seasonsDetail[metadata.lastSeason];

        return {
            idSerie: idSerie,
            lastSeason: metadata.lastSeason,
            lastChapter: (ulti === undefined) ? 0 : ulti.lastChapter,
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
        trex: {
            //urlSeries: 'http://trex-lovehinaesp.rhcloud.com/api/trex/series',
            //urlSearchSerie: 'http://trex-lovehinaesp.rhcloud.com/api/trex/searchserie',
            urlSearch: 'http://trex2-crystaltales.rhcloud.com/api/trex/search',
            urlDownloadSearchTorrent: 'http://trex2-crystaltales.rhcloud.com/api/trex/downloadTorrent',
            urlGetSerie: 'http://trex2-crystaltales.rhcloud.com/api/trex/serie',
            urlAddSerie: 'http://trex2-crystaltales.rhcloud.com/api/trex/addSerie',
            urlDownloadTorrent: 'http://trex2-crystaltales.rhcloud.com/api/trex/download'
            //urlSeries: 'http://localhost/api/trex/series',
            //urlSearchSerie: 'http://localhost/api/trex/searchserie',
            // urlSearch: 'http://localhost/api/trex/search',
            // urlDownloadSearchTorrent: 'http://localhost/api/trex/downloadTorrent'
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
