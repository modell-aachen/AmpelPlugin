# ---+ Extensions
# ---++ AmpelPlugin
# **STRING**
# The default ID of the table that is to receive the traffic light.
$Foswiki::cfg{Extensions}{AmpelPlugin}{CSS} = '#ampel';
# **NUMBER**
# The default warning time (days to expiry when the light switches to amber).
$Foswiki::cfg{Extensions}{AmpelPlugin}{WARN} = 2;
# **STRING**
# Default name of the column that will hold the light.
$Foswiki::cfg{Extensions}{AmpelPlugin}{DST} = 'Ampel';
# **STRING**
# Default name of the column that will control the light
$Foswiki::cfg{Extensions}{AmpelPlugin}{DATE} = 'Termin';
# **STRING**
# Default name of the column that might disable the light.<p>Set to empty to disable this feature</p>
$Foswiki::cfg{Extensions}{AmpelPlugin}{MODE} = '';
# **STRING**
# Default mode for grouped lights, set to empty, worst or best.<p>Defaults to 'worst' when left empty.</p>
$Foswiki::cfg{Extensions}{AmpelPlugin}{DONE} = '';
# **STRING**
# Default RegEx that will disable the light.
$Foswiki::cfg{Extensions}{AmpelPlugin}{COND} = '';
# **STRING**
# Default RegEx that will make the light turn amber. Will be tested on the DATE column;<p>Set to empty to disable.
$Foswiki::cfg{Extensions}{AmpelPlugin}{WCOND} = '';
# **BOOLEAN**
# Lights can be printed with prince by default (if prince is configured with --script=[path to foswiki]/pub/System/AmpelPlugin/ampel.js)
$Foswiki::cfg{Extensions}{AmpelPlugin}{printable} = 0;

1;
