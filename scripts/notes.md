# Notes

## Prerequisites

Before running some scripts, Pywikibot must be installed and configured.

```sh
git clone git@github.com:wikimedia/pywikibot.git
cd pywikibot
vim pywikibot/families/dogwitch_family.py # See below
vim user-config.py # See below (swap out "hunter2" with the real password)
vim user-password.py # See below (swap out "hunter2" with the real password)
```

## `dogwitch_family.py`

```py
from pywikibot import family

class Family(family.Family):
    name = 'dogwitch'
    langs = {
        'en': 'dogwitch.wiki.gg',
    }

    def scriptpath(self, code):
        return ''

    def protocol(self, code):
        return 'https'
```

## `user-config.py`

```py
family = 'dogwitch'
mylang = 'en'
authenticate['dogwitch.wiki.gg'] = ('wikigg3', 'hunter2')
usernames['dogwitch']['en'] = 'Zamiel'
password_file = "user-password.py"
```

## `user-password.py`

```py
# This is an automatically generated file used to store
# BotPasswords.
#
# As a simpler (but less secure) alternative to OAuth, MediaWiki allows bot
# users to uses BotPasswords to limit the permissions given to a bot.
# When using BotPasswords, each instance gets keys. This combination can only
# access the API, not the normal web interface.
#
# See https://www.mediawiki.org/wiki/Manual:Pywikibot/BotPasswords for more
# information.
('Zamiel', BotPassword('pwb', 'hunter2'))
```
