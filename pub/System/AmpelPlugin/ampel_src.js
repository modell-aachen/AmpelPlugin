jQuery(document).ready(function() {
    function getTag(level, altText) {
        if (altText === undefined) altText = '';
        return imgTags[level] + altText + imgTags[4];
    }

    // Wenn dieser Test besteht, ist es hoffentlich ein Array
    if(typeof(AmpelData) !== "object" || AmpelData.length === undefined) return;

    var datum = new Date();

    // gleiche Einstellungen fuer alle Ampeln
    var puburlpath;
    if(AmpelData.length > 0) {
        puburlpath = AmpelData.shift();
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
    while(AmpelData.length >= 6) {
        // Pop den ganzen Kram in der umgekehrten Reihenfolge wieder vom Array runter:
        var AmpelWCond = AmpelData.pop();
        var AmpelDCond = AmpelData.pop();
        var AmpelDText = AmpelData.pop();
        var AmpelWarn = AmpelData.pop();
        var AmpelTText = AmpelData.pop();
        var AmpelAText = AmpelData.pop();
        var AmpelID = AmpelData.pop();
        //alert("ID: "+AmpelID+" Ampeltext: "+AmpelAText+" Termintext: " +AmpelTText+" Warn: " +AmpelWarn+" Done: " + AmpelDText+" Cond: "+AmpelDCond);

        // Diese Felder muessen vorhanden sein
        if(typeof(AmpelID) != "string" || AmpelID == "" || typeof(AmpelAText) != "string" || AmpelAText == "" || typeof(AmpelWarn) != "number") {continue;}

        // WCond ist optional
        var WCond = null;
        if(AmpelWCond != "") {
            WCond = new RegExp(AmpelWCond,"i");
        }

        // Tabelle raussuchen und bearbeiten
        var tabellen = document.getElementById(AmpelID);
        if(tabellen !== null && tabellen !== undefined) {
            // Wenn das Objekt mit AmpelID ein div ist, benutze (erste) Tabelle darin
            if(tabellen.tagName.toUpperCase() == "DIV") {
                tabellen = tabellen.getElementsByTagName("table");
                if(tabellen.length != 0) {
                    tabellen = tabellen[0];
                } else {
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
                cell = jQuery.trim(cell);
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
                continue;
            }

            var d = datum; // Wird das Ablaufdatum halten

            // Gehe alle Zeilen durch und setze ggf. Ampel
            try {
                for (var zeileNr = 1; zeileNr < zeilen.length; zeileNr++) {
                    var zeile = zeilen[zeileNr];
                    var str = "";
                    if(zeile.cells === undefined) {
                        continue;
                    }

                    // Pruefe, ob Aufgabe abgeschlossen
                    if(done > 0) {
                        str = jQuery.trim(zeile.cells[done].textContent || zeile.cells[done].innerText);
                        if(reg.test(str)) {
                            zeile.cells[ampel].innerHTML = getTag(0, str); 
                            continue;
                        }
                    }

                    // Suche Termin-Datum
                    str = jQuery.trim(zeile.cells[termin].innerHTML);
                    try { 
                        // Datum rausssuchen
                        var split = /(\d\d?)\.(\d\d?)\.(\d{2,4})?/.exec(str);
                        if(split === null) {
                            // Check for warn-words
                            if(WCond != null && WCond.test(str)) {
                                d = datum;
                            } else {
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
                                    if(gefunden == 0) continue;
                                    d = new Date(split[3], m, split[1]);
                                } else {
                                    continue;
                                }
                            }
                        } else {    
                            if(split[3] === undefined || split[3] === "") { // Falls ohne Jahr: 27.07.
                                split[3] = datum.getFullYear(); // Kann auch 2-Stellig sein (IE)
                            }
                            if(split[3] < 2000) split[3] = Number(split[3]) + 2000; // JJ in JJJJ umwandeln

                            d = new Date(split[3], split[2]-1, split[1], 23, 59);
                        }
                    }
                    catch(e)
                    {
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
});
