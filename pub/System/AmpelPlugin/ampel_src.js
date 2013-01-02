jQuery(AmpelPluginRenderer);

function AmpelPluginRenderer($) {
    function log(message) {
        if(typeof console !== 'undefined' && console.log)
            console.log(message);
    }

    function getTag(level, altText) {
        if (altText === undefined) altText = '';
        return imgTags[level] + altText + imgTags[4];
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
                    if(gefunden == 0) return -1;
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
    if(typeof(AmpelData) !== "object" || AmpelData.length === undefined) return;

    if(AmpelData.length == 0) {
        return;
    }

    var datum = new Date();

    // gleiche Einstellungen fuer alle Ampeln
    var puburlpath;
    puburlpath = AmpelData[0];
    if(typeof(puburlpath) != "string") {
        log("No puburlpath!");
        return;
    }

    // Array mit img-Tags.
    // Ist fuer gilt: 0 -> Haeckchen, 1 -> gruen, 2 -> gelb, 3 -> rot
    var imgTags = new Array(
        "<img src='" + puburlpath + "/System/FamFamFamSilkIcons/tick.png' alt='' title='",
        "<img src='" + puburlpath + "/System/AmpelPlugin/images/ampel_g.gif' alt='' title='",
        "<img src='" + puburlpath + "/System/AmpelPlugin/images/ampel_o.gif' alt='' title='",
        "<img src='" + puburlpath + "/System/AmpelPlugin/images/ampel_r.gif' alt='' title='",
        "'>"
    );

    // Gehe alle Ampeln durch
    // Ueberspringe ersten Index, da dort puburlpath
    for(var aNr = 1; aNr < AmpelData.length; aNr++) {
        var eachAmpel = AmpelData[aNr];
        var AmpelWCond = eachAmpel.wcheck;
        var AmpelDCond = eachAmpel.dcheck;
        var AmpelDText = eachAmpel.done;
        var AmpelWarn = eachAmpel.warn;
        var AmpelTText = eachAmpel.termin;
        var AmpelAText = eachAmpel.dst;
        var AmpelID = eachAmpel.id;
        var AmpelMode = eachAmpel.mode;

        // Diese Felder muessen vorhanden sein
        if(typeof(AmpelID) != "string" || AmpelID == "" || typeof(AmpelAText) != "string" || AmpelAText == "" || typeof(AmpelWarn) != "number") {
            log("Necessary fields not found!");
            continue;
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
                log("Unknown mode: '" + AmpelMode + "' in id: '" + AmpelID + "'");
            }
            AmpelMode = false;
        }

        // Tabelle raussuchen und bearbeiten
        var tabellen = document.getElementById(AmpelID);
        if(tabellen === null || tabellen === undefined) {
            log("Id '" + AmpelID + "' not found!");
            continue;
        }

        // Wenn das Objekt mit AmpelID ein div ist, benutze (erste) Tabelle darin
        if(tabellen.tagName.toUpperCase() == "DIV") {
            tabellen = tabellen.getElementsByTagName("table");
            if(tabellen.length != 0) {
                tabellen = tabellen[0];
            } else {
                log("No table found in div with id '" + AmpelID + "'!");
                continue;
            }
        }

        var zeilen = tabellen.rows; 

        var head = zeilen[0]; // Kopfzeile

        var termin = -1; // Spaltennummer Termin
        var ampel = -1; // Spaltennummer Ampel
        var done = -1; // Spaltennummer Erledigt
        var reg = false; // RegEx zum pruefen von Erledigt

        // Pruefe ob optionale Erledigt-Spalte vorhanden
        if(AmpelDText != "" && AmpelDCond != "") {
            reg = new RegExp(AmpelDCond,"i");
        }    

        // Suche Spaltennummern raus
        for (var i = 0; i < head.cells.length; i++) {
            var cell = head.cells[i].textContent || head.cells[i].innerText; // textContent for FF innerText for the rest 
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
            log("Light with id '" + AmpelID + "': Column for date, or destination not found!");
            continue;
        }

        // Gehe alle Zeilen durch und setze ggf. Ampel
        try {
            for (var zeileNr = 1; zeileNr < zeilen.length; zeileNr++) {
                var d = null; // Wird das Ablaufdatum halten
                var zeile = zeilen[zeileNr];
                var str = "";
                if(zeile.cells === undefined) {
                    // Kein Fehler, einfach eine leere Zelle
                    continue;
                }

                // Pruefe, ob Aufgabe abgeschlossen
                if(done > 0) {
                    str = $.trim(zeile.cells[done].textContent || zeile.cells[done].innerText);
                    if(reg.test(str)) {
                        zeile.cells[ampel].innerHTML = getTag(0, str); 
                        continue;
                    }
                }

                // Suche Termin-Datum
                str = $.trim(zeile.cells[termin].innerHTML);

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
                if (tage < 0) {
                    zeile.cells[ampel].innerHTML = getTag(3, "schon "+Math.floor(-tage)+" Tage abgelaufen");
                } else if (tage <= AmpelWarn) {
                    zeile.cells[ampel].innerHTML = getTag(2, "noch "+Math.floor(tage)+" Tage");
                } else {
                    zeile.cells[ampel].innerHTML = getTag(1, "noch "+Math.floor(tage)+" Tage");
                }
            }
        } catch (e) {
            // Sometimes cells[...] can be undefined (ie. empty foswiki-tables have a hidden <tr> with only 1 <td>, or with colspans)
        }
    }
}
