# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details, published at
# http://www.gnu.org/copyleft/gpl.html

=pod

---+ package Foswiki::Plugins::AmpelPlugin

=cut


package Foswiki::Plugins::AmpelPlugin;

# Always use strict to enforce variable scoping
use strict;
use warnings;

use Foswiki::Func    ();    # The plugins API
use Foswiki::Plugins ();    # For the API version

our $VERSION = '$Rev: 11239 $';

our $RELEASE = '1.2.1';

# Short description of this plugin
our $SHORTDESCRIPTION = 'Signals the time remaining to a date in a Table with a traffic light.';

our $NO_PREFS_IN_TOPIC = 1;

sub initPlugin {
    my ( $topic, $web, $user, $installWeb ) = @_;

    # check for Plugins.pm versions
    if ( $Foswiki::Plugins::VERSION < 2.0 ) {
        Foswiki::Func::writeWarning( 'Version mismatch between ',
            __PACKAGE__, ' and Plugins.pm' );
        return 0;
    }

    Foswiki::Func::registerTagHandler( 'AMPEL', \&_AMPELTAG );

    # Plugin correctly initialized
    return 1;
}

sub _AMPELTAG {
    my($session, $params, $topic, $web, $topicObject) = @_;

    # Common parameters
    my $puburlpath = Foswiki::Func::getPubUrlPath();
    # Parameters
    my $id = $params->{_DEFAULT} || $Foswiki::cfg{Extensions}{AmpelPlugin}{ID} || 'ampel';
    my $warn = $params->{WARN} || $Foswiki::cfg{Extensions}{AmpelPlugin}{WARN} || 2;
    my $ampel = $params->{DST} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DST} || 'Ampel';
    my $termin = $params->{DATE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DATE} || 'Termin';
    my $done = $params->{DONE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DONE} || '';
    my $donecheck = $params->{COND} || $Foswiki::cfg{Extensions}{AmpelPlugin}{COND} || '';
    my $warncheck = $params->{WCOND} || $Foswiki::cfg{Extensions}{AmpelPlugin}{WCOND} || '';
    my $mode = $params->{MODE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{MODE} || '';
    my $livequery = ($params->{LIVEQUERY}) ? 1 : 0;

    # Script to pass parameters to ampel.js
    Foswiki::Func::addToZone('script', "AMPELPLUGIN::$id.$ampel", <<HERE, 'SCRIPT::AMPELPLUGIN');
<script type="text/javascript"> AmpelData.push({id:'$id',dst:'$ampel',termin:'$termin',warn:$warn,done:'$done',dcheck:'$donecheck',wcheck:'$warncheck',mode:'$mode', livequery:$livequery}); </script>
HERE

    # Add script that will insert traffic lights
    Foswiki::Func::addToZone('script', 'SCRIPT::AMPELPLUGIN', <<SCRIPT, 'JQUERYPLUGIN::FOSWIKI,JQUERYPLUGIN::LIVEQUERY'); # XXX hard to determine if livequery is required when there are multiple lights
<script type="text/javascript" src="%PUBURL%/System/AmpelPlugin/ampel.js?version=$RELEASE"></script>
<script type="text/javascript"> AmpelData = new Array("$puburlpath"); </script>
SCRIPT

    return "";
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Author: %$AUTHOR%

Copyright (C) 2008-2011 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
