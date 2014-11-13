function AmpelPluginRenderer($) {
    "use strict";

    var prince;
    if(typeof(Prince) !== 'undefined') {
        // called from prince
        prince = 1;

        $ = jQuery; // for some reason I need to set $ manually
    }

    function log(message) {
        if(typeof console !== 'undefined' && console.log)
            console.log(message);
    }

    function getTag(level, altText) {
        if (altText === undefined) altText = '';
        return imgTags[level] + altText + imgTags[4];
    }

    function getColoredDate( dateStr, color )  {
        var str = '<span style="color: ' + color + '">' + dateStr + '</span>';
        return str;
    }

    function renderAmpel($, eachAmpel, $tabellen) {
        var AmpelWCond = eachAmpel.wcheck;
        var AmpelDCond = eachAmpel.dcheck;
        var AmpelDText = eachAmpel.done;
        var AmpelWarn = new Number(eachAmpel.warn);
        var AmpelTText = eachAmpel.termin;
        var AmpelAText = eachAmpel.dst;
        var AmpelMode = eachAmpel.mode;
        var AmpelCSS = eachAmpel.css;

        if(!eachAmpel.printable && prince) return;

        // Diese Felder muessen vorhanden sein
        if(typeof(AmpelCSS) != "string" || AmpelCSS == "" || typeof(AmpelAText) != "string" || AmpelAText == "" || isNaN(AmpelWarn)) {
            log("Necessary fields not found!");
            return;
        }

        // WCond ist optional
        var WCond = null;
        if(AmpelWCond != "") {
            WCond = new RegExp(AmpelWCond,"i");
        }

        // Mode
        if(AmpelMode == "best") {
            AmpelMode = true;
        } else {
            if(AmpelMode.length !== 0 && AmpelMode != "worst") {
                log("Unknown mode: '" + AmpelMode + "' in light: '" + AmpelCSS + "'");
            }
            AmpelMode = false;
        }

        // Wenn das Objekt mit AmpelCSS ein div ist, benutze (erste) Tabelle darin
        var tabellen = $tabellen[0]; // livequery should deliver only one light
        if(tabellen.tagName.toUpperCase() == "DIV") {
            tabellen = tabellen.getElementsByTagName("table");
            if(tabellen.length != 0) {
                tabellen = tabellen[0];
            } else {
                log("No table found in div with '" + AmpelCSS + "'!");
                return;
            }
        }

        var $zeilen = $tabellen.find('tr');
        if($zeilen.length === 0) {
            log("Table seems to be empty: " + AmpelCSS);
            return;
        }

        var $head = $zeilen.first(); // Kopfzeile
        var termin = -1; // Spaltennummer Termin
        var ampel = -1; // Spaltennummer Ampel
        var done = -1; // Spaltennummer Erledigt
        var reg = false; // RegEx zum pruefen von Erledigt

        // Pruefe ob optionale Erledigt-Spalte vorhanden
        if(AmpelDText != "" && AmpelDCond != "") {
            reg = new RegExp(AmpelDCond,"i");
        }
        // Suche Spaltennummern raus
        var $cells = $head.find('td,th');
        for (var i = 0; i < $cells.length; i++) {
            var cell = $cells.eq(i).text();
            cell = $.trim(cell);
            if(cell == AmpelAText) {
                ampel = i;
            }
            if(cell == AmpelTText) {
                termin = i;
            }
            if(reg != false && cell == AmpelDText) {
                done = i;
            }
        }
        // Ohne "Ampel" und "Termin" laeuft das Plugin nicht, "Done" ist optional
        if(termin == -1 || ampel == -1) {
            log("Light with '" + AmpelCSS + "': Column for date, or destination not found!");
            return;
        }

        // Gehe alle Zeilen durch und setze ggf. Ampel
        try {
            for (var zeileNr = 1; zeileNr < $zeilen.length; zeileNr++) {
                var d = null; // Wird das Ablaufdatum halten
                var $zeile = $zeilen.eq(zeileNr);
                var str = "";
                var $cells = $zeile.find('td,th');
                if(!$cells.length) {
                    // Kein Fehler, einfach eine leere Zelle
                    continue;
                }

                // Pruefe, ob Aufgabe abgeschlossen
                if(done > 0) {
                    str = $.trim($cells.eq(done).text());
                    if(reg.test(str)) {
                        $cells.eq(ampel).html(getTag(0, str));
                        continue;
                    }
                }

                // Suche Termin-Datum
                str = $.trim($cells.eq(termin).text());

                var dates = str.split(";");
                for(var i = 0; i < dates.length; i++) {
                    var eachDate = parseDate(dates[i]);
                    if(eachDate == null) continue;
                    if(d === null) {
                        d = eachDate;
                        continue;
                    }
                    if(AmpelMode) {
                        if(d.getTime() < eachDate.getTime()) d = eachDate;
                    } else {
                        if(d.getTime() > eachDate.getTime()) d = eachDate;
                    }
                }

                // Check for warn-words
                if(WCond != null && WCond.test(str)) {
                    d = datum;
                }
                if(d === null) {
                    // kein Datum gefunden
                    continue;
                }

                var tage = (d.getTime() - datum.getTime())/86400000;

                // colorify due date in case preference key AMPELPLUGIN_HIDE_AMPEL ist set
                var isHidden = eachAmpel.hidden == '1' || eachAmpel.hidden == 'true';
                var content;
                if ( isHidden ) {
                    var due = $.trim($cells.eq(termin).text());
                    if (tage < 0) {
                        content = getColoredDate( due, 'red' );
                    } else if (tage <= AmpelWarn) {
                        content = getColoredDate( due, 'orange' );
                    } else {
                        content = getColoredDate( due, 'green' );
                    }
                } else {
                    if (tage < 0) {
                        content = getTag(3, "schon "+Math.floor(-tage)+" Tage abgelaufen");
                    } else if (tage <= AmpelWarn) {
                        content = getTag(2, "noch "+Math.floor(tage)+" Tage");
                    } else {
                        content = getTag(1, "noch "+Math.floor(tage)+" Tage");
                    }
                }
                $cells.eq(ampel).html(content);
            }
        } catch (e) {
            // Sometimes cells[...] can be undefined (ie. empty foswiki-tables have a hidden <tr> with only 1 <td>, or with colspans)
        }
    }

    function parseDate(str) {
        var date = null;
        try {
            // Datum rausssuchen
            var split = /(\d\d?)\.(\d\d?)\.(\d{2,4})?/.exec(str);
            if(split === null) {
                // Englisches Format?
                split = /(\d\d?) (\w{3}) (\d{2,4})/.exec(str);
                if(split !== null) {
                    var m = split[2];
                    var monthArray = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "err");
                    var gefunden = 0;
                    for(var i = 0; i < monthArray.length; i++) {
                        if(m == monthArray[i]) {
                            m = i;
                            gefunden = 1;
                            break;
                        }
                    }
                    if(gefunden == 0) return null;
                    date = new Date(split[3], m, split[1], 23, 59);
                } else {
                    return null;
                }
            } else {
                if(split[3] === undefined || split[3] === "") { // Falls ohne Jahr: 27.07.
                    split[3] = datum.getFullYear(); // Kann auch 2-Stellig sein (IE)
                }
                if(split[3] < 2000) split[3] = Number(split[3]) + 2000; // JJ in JJJJ umwandeln

                date = new Date(split[3], split[2]-1, split[1], 23, 59);
            }
        }
        catch(e)
        {
            log("Error while parsing date '" + str + "': " + e);
            return null;
        }
        return date;
    }

    // Wenn dieser Test besteht, ist es hoffentlich ein Array
//    if(typeof(AmpelData) !== "object" || AmpelData.length === undefined) return;

//    if(AmpelData.length == 0) {
//        return;
//    }

    var datum = new Date();

    var $cfg = $('SCRIPT.AmpelCfg');
    if(!$cfg.length) {
        log('No AmpelCfg');
        return;
    }
    $cfg = $.parseJSON($cfg.html());
    if(!$cfg) {
        log('could not parse cfg');
        return;
    }
    // gleiche Einstellungen fuer alle Ampeln
    var systempath = $cfg.systempath;
    if(typeof(systempath) != "string") {
        log("No systempath!");
        return;
    }

    // Array mit img-Tags.
    // Ist fuer gilt: 0 -> Haeckchen, 1 -> gruen, 2 -> gelb, 3 -> rot
    var imgTags = new Array(
        "<img src='" + systempath + "FamFamFamSilkIcons/tick.png' alt='' title='",
        "<img src='" + systempath + "AmpelPlugin/images/ampel_g.png' alt='' title='",
        "<img src='" + systempath + "AmpelPlugin/images/ampel_o.png' alt='' title='",
        "<img src='" + systempath + "AmpelPlugin/images/ampel_r.png' alt='' title='",
        "'>"
    );

    // Gehe alle Ampeln durch
    $('SCRIPT.AmpelData').each(function(idx, script) {
        var data = $.parseJSON($(script).html());
        if(!data || !data.css) {
            log('No css in script: ' + script);
        }
        if(prince) {
            // it seems livequery is not supported by prince yet
            renderAmpel($, data, $(data.css));
        } else {
            (function(dataClosure){
                $(dataClosure.css).livequery( function() {
                    try {
                        renderAmpel($, dataClosure, $(this));
                    } catch (e) {
                        log(e);
                    }
                });
            })(data);
        }
    });
}

try {
    jQuery(AmpelPluginRenderer);
} catch (e) {
    log(e);
}
