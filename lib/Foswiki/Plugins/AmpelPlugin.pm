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

use JSON;
use POSIX;

our $VERSION = '1.2';

our $RELEASE = "1.2";

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
    Foswiki::Func::registerTagHandler( 'SIGNAL', \&_SIGNALTAG );

    # Plugin correctly initialized
    return 1;
}

sub _subTimeFromEpochDate{
    my $epoch  = shift;
    my ($sec, $min, $hour, $day,$month,$year) = (localtime($epoch))[0,1,2,3,4,5];

    my $newEpoch = $epoch;
    $newEpoch= $newEpoch - $hour*60*60 if $hour > 0;
    $newEpoch = $newEpoch - $min*60 if $min > 0;
    $newEpoch = $newEpoch - $sec if $sec > 0;
    return $newEpoch;
}

sub _SIGNALTAG {
    my( $session, $params, $topic, $web, $topicObject ) = @_;

    my $title = '%MAKETEXT{"Missing due date"}%';
    my $date = $params->{_DEFAULT} || $params->{date};
    my $status = $params->{status} || 'open';
    my $warn = $params->{warn} || 3;

    return "<img src=\"%PUBURL%/%SYSTEMWEB%/AmpelPlugin/images/ampel.png\" alt=\"\" title=\"$title\" />" if ( !$date && $status eq 'open' );

    my $src = '';
    if ( $status eq 'open' ) {
        my $now = scalar time();
        $now = _subTimeFromEpochDate($now);

        my $secs = $date;
        $secs = Foswiki::Time::parseTime($date) unless $secs =~ /^\d+$/;
        $secs = _subTimeFromEpochDate($secs);

        my $offset = $warn * 24 * 60 * 60;
        my $state = 'g';
        $state = 'o' if $now  + $offset > $secs;
        $state = 'r' if $now > $secs;
        $src = "%PUBURL%/%SYSTEMWEB%/AmpelPlugin/images/ampel_$state.png";

        my $delta = ($secs - $now)/86400;
        my $abs = ceil(abs($delta));
        $title = '%MAKETEXT{"In one day"}%' if $delta > 0 && $delta <= 1;
        $title = "%MAKETEXT{\"In [_1] days\" args=\"$abs\"}%" if $delta > 1;
        $title = '%MAKETEXT{"One day over due"}%' if $delta >= -2 && $delta < -1;
        $title = '%MAKETEXT{"This very day"}%' if $delta > -1 && $delta <= 0;
        $title = "%MAKETEXT{\"[_1] days over due\" args=\"$abs\"}%" if $delta <= -1;
    } else {
        $src = "%PUBURL%/%SYSTEMWEB%/FamFamFamSilkIcons/".($status eq 'closed' ? 'tick' : 'cross').".png";
    }

    my $img = <<IMG;
<img src="$src" alt="" title="$title" />
IMG

    return $img;
}

sub _AMPELTAG {
    my($session, $params, $topic, $web, $topicObject) = @_;

    # Common parameters
    my $systempath = Foswiki::Func::getPubUrlPath() . '/' . $Foswiki::cfg{SystemWebName} . '/';
    # Parameters
    my %ampel = ();
    my $id = $params->{_DEFAULT};
    my $query = $params->{QUERY} || $Foswiki::cfg{Extensions}{AmpelPlugin}{QUERY} || '#ampel';
    my $ampel = $params->{DST} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DST} || 'Ampel';
    $ampel{warn} = $params->{WARN} || $Foswiki::cfg{Extensions}{AmpelPlugin}{WARN} || 2;
    $ampel{termin} = $params->{DATE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DATE} || 'Termin';
    $ampel{done} = $params->{DONE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{DONE} || '';
    $ampel{dcheck} = $params->{COND} || $Foswiki::cfg{Extensions}{AmpelPlugin}{COND} || '';
    $ampel{wcheck} = $params->{WCOND} || $Foswiki::cfg{Extensions}{AmpelPlugin}{WCOND} || '';
    $ampel{go} = $params->{GREENOVERRIDE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{GREENOVERRIDE} || '';
    $ampel{ao} = $params->{AMBEROVERRIDE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{AMBEROVERRIDE} || '';
    $ampel{ro} = $params->{REDOVERRIDE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{REDOVERRIDE} || '';
    $ampel{mode} = $params->{MODE} || $Foswiki::cfg{Extensions}{AmpelPlugin}{MODE} || '';
    my $printable = $params->{printable};
    $printable = $Foswiki::cfg{Extensions}{AmpelPlugin}{printable} unless defined $printable;
    $ampel{printable} = ($printable)?1:0;

    my $css = ( ($id) ? "#$id" : $query );
    $ampel{css} = $css;

    # additional option to disable rendering an 'ampel' (colorify the due date instead)
    my $isHidden = Foswiki::Func::getPreferencesValue( 'AMPELPLUGIN_HIDE_AMPEL', $web ) || 0;
    $isHidden = Foswiki::Func::getPreferencesValue( 'AMPELPLUGIN_HIDE_AMPEL' ) || 0 unless $isHidden;
    if ( $isHidden eq 1 ) {
        $ampel = $ampel{termin};
    }
    $ampel{dst} = $ampel;
    $ampel{hidden} = $isHidden;

    # expand parameters
    foreach my $key (keys %ampel) {
        $ampel{$key} = Foswiki::Func::expandCommonVariables(
            Foswiki::Func::decodeFormatTokens($ampel{$key}),
            $web,
            $topic
        );
    }

    # Script to pass parameters to ampel.js
    my $json = encode_json(\%ampel);
    # we need to make sure this can not expand any further, to prevent injecting stuff into the script zone
    $json =~ s#%#%<nop>#g;
    $json =~ s#\$#\$<nop>#g;
    $json = Encode::decode($Foswiki::cfg{Site}{CharSet}, $json);
    Foswiki::Func::addToZone('script', "AMPELPLUGIN::$css.$ampel", <<HERE, 'SCRIPT::AMPELPLUGIN');
<script type="text/plain" class="AmpelData">$json</script>
HERE

    # Add script that will insert traffic lights
    Foswiki::Func::addToZone('script', 'SCRIPT::AMPELPLUGIN', <<SCRIPT, 'JQUERYPLUGIN::FOSWIKI,JQUERYPLUGIN::LIVEQUERY'); # XXX hard to determine if livequery is required when there are multiple lights
<script type="text/javascript" src="%PUBURL%/System/AmpelPlugin/ampel.js?version=$RELEASE"></script>
<script type="text/plain" class="AmpelCfg">{"systempath": "$systempath"}</script>
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
