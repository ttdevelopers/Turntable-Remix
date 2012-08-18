(function ($, window, undefined) {
    
    define(['require', 'underscore', 'backbone'], function (require, _, Backbone) {
        var Room,
            Songs,
            Song,
            Users,
            User;
        
        function Remix() {
                
            this.room = null;
            this.nodes = {};
            this.pendingActions = {};
            
            if (util.getSetting('autoAwesome')===null) { 
                util.setSetting('autoAwesome', 'off'); 
            }
            
            var keys = Object.keys(turntable);
            turntable.api = turntable[keys[keys.indexOf('getHashedAddr') + 1]];
            
            turntable.socket.on('message', this.messageListener.bind(this));

            this.overwriteAnimations = function () {
                turntable.room.manager.update_vote = function(user, vote) {
                    var listener = turntable.room.manager.listeners[user.userid];
                    if (listener) {
                        var userHead = $(listener.body()).find('.headback'); 
                        if (vote=='up') {
                            userHead.addClass('rock');
                        }
                        else {
                            userHead.removeClass('rock');
                        }
                        return;
                    }
                    var dj = turntable.room.manager.djs_uid[user.userid];
                    if (dj) {
                        var userHead = $(dj[0].body()).find('.headfront'); 
                        if (vote=='up') {
                            userHead.addClass('rock');
                        }
                        else {
                            userHead.removeClass('rock');
                        }
                        return;
                    }
                };
                var userid;
                var userHead;
                for (var i in turntable.room.upvoters) {
                    userid = turntable.room.upvoters[i];
                    (turntable.room.manager.listeners[userid]||turntable.room.manager.djs_uid[userid][0]).stop();
                    turntable.room.manager.update_vote({userid: userid}, 'up');
                }
            };
            
            this.overwriteGuestList = function () {
                turntable.room.updateGuestList = function () {
                    var b = [],
                        g = $(".guest-list-container .guests");
                    b = _.sortBy(turntable.room.users, function(user, userid) {
                        var rank = '4';
                        if (user.fanof) {
                            rank = '3';
                        } 
                        if (turntable.room.moderators.indexOf(userid)>=0) {
                            rank = '1';
                        }
                        if (user.acl>0) { 
                            rank = '0'; 
                        }
                        if (turntable.room.djIds.indexOf(userid)>=0) {
                            rank = '2'+turntable.room.djIds.indexOf(userid)
                        }
                        user.rank = rank;
                        return rank + user.name.toLowerCase();
                    });
                    var c = g.find(".guest.selected").data("id");
                    g.find(".guest").remove();
                    remix.nodes.guestList = {};
                    for (var e = 0, a = b.length; e < a; e++) {
                        var d = (c && c == b[e].userid) ? true : false;
                        g.append(util.buildTree(remix.room.layouts.guestListName(b[e], this, d), remix.nodes.guestList));
                    }
                    $("span#totalUsers").text(b.length);
                    this.updateGuestListMenu();
                };
                turntable.room.updateGuestList();
            };

            this.load = load = function () {
                if (!turntable.hasOwnProperty('room')) {
                    for (var i in turntable) {
                        if (turntable.hasOwnProperty(i) && turntable[i] && turntable[i].hasOwnProperty('selfId')) {
                            turntable.room = turntable[i];
                            //console.log('Found room object.');
                            this.room = new Room;
                        }
                    }
                }
                if (turntable.hasOwnProperty('room') && !turntable.room.hasOwnProperty('manager')) {
                    for (var i in turntable.room) {
                        if (turntable.room.hasOwnProperty(i) && turntable.room[i] && turntable.room[i].hasOwnProperty('myuserid')) {
                            turntable.room.manager = turntable.room[i];
                            //console.log('Found manager object.');
                            if (turntable.room.currentSong) {
                                this.room.songs.add(new Song(turntable.room.currentSong));
                                this.room.applyTooltips();
                               // this.overwriteAnimations();
                               this.overwriteGuestList();
                            }
                        }
                    }
                }
                if (!turntable.hasOwnProperty('room') || turntable.hasOwnProperty('room') && !turntable.room.hasOwnProperty('manager')) {
                    setTimeout(this.load.bind(this), 100);
                }
                else {
                    //console.log('Found room and manager objects.');
                }
            };
            
            this.load();
        }
        
        Remix.prototype.messageListener = function (data) {
            var data = JSON.parse(data);
            
            if (data.command!==undefined) {
                if (this.events.hasOwnProperty(data.command)) {
                    this.events[data.command].bind(this)(data);
                }
                if (this.room.layouts.activities.hasOwnProperty(data.command)) {
                    var activity = this.room.layouts.activities[data.command](data);
                    if (activity) {
                        activity = $(remix.nodes.activities).prepend(util.buildTree(activity)).children(':first');
                        if (activity[0].scrollWidth > 300) {
                            activity.addClass('oversized');
                        }
                        var a = $(remix.nodes.activities).children('li')[250];
                        if (a) { a.remove(); }
                    }
                    else {
                        //console.log(data.command, data);
                    }
                }
            }
            else if (data.hasOwnProperty('list')) {
                setTimeout(this.room.updateSongCount, 250);
            }
            else if (data.hasOwnProperty('room') && data.hasOwnProperty('users')) {
                //console.log('Room info: %o', data);
                turntable.room.upvoters = [];
                for (i in data.room.metadata.votelog) {
                    if (data.room.metadata.votelog[i][1]=='up') {
                        if (data.room.metadata.votelog[i][0]==turntable.user.id) {
                            setTimeout(function() { // Eventually remove all these setTimeouts and push to "todoWhenLoaded"
                                $('.upvotes').addClass('active');
                            }, 250);
                        }
                        turntable.room.upvoters.push(data.room.metadata.votelog[i][0]);
                    }
                }
                remix.room.updateTitle();
                setTimeout(function (d) {
                    this.room.songs.currentSong.updateVotes(d.room.metadata);
                    for (var i = 0; i<d.users.length; i++) {
                        this.room.users.add(new User(d.users[i]));
                    }
                }.bind(this), 250, data);
            }
            else if (data.msgid) {
                if (this.pendingActions.hasOwnProperty(data.msgid)) {
                    if (data.success) {
                        this.pendingActions[data.msgid]();
                    }
                    else {
                        turntable.room.showRoomTip(data.err, 3);
                        delete this.pendingActions[data.msgid];
                    }
                } else {
                    //console.log(data);
                }
            }
            else {
                //console.log(data);
            }
        };
        
        Remix.prototype.events = {
            'newsong': function (data) {
                this.room.songs.add(new Song(data.room.metadata.current_song));
            }, 
            'registered': function (data) {
                this.room.users.add(new User(data.user[0]));
            }, 
            'playlist_complete': function (data) {
                this.room.updateSongCount();
            }, 
            'snagged': function (data) {
                this.room.songs.currentSong.updateQueues();
            }, 
            'update_votes': function (data) {
                if (data.room.metadata.votelog[0][0]==turntable.user.id) {
                    $('.upvotes').addClass('active');
                    $('.downvotes').removeClass('active');
                }
                this.room.songs.currentSong.updateVotes(data.room.metadata);
            }
        };
        
        Remix.prototype.verifyAction = function (msgid, action) {
            this.pendingActions[msgid] = function () {
                if (action=='upvote' || action=='downvote') {
                    $('.upvotes, .downvotes').removeClass('active');
                }
                $('.'+action+'s').addClass('active');
            };
            setTimeout(function(msgid) {
                if (this.pendingActions.hasOwnProperty(msgid)) {
                    delete this.pendingActions[msgid];
                }
            }.bind(this), 5000, msgid)
        };
        
        Songs = Backbone.Collection.extend({
            model: Song, 
            initialize: function () {
                this.on('add', this.updateNowPlaying); 
            }, 
            updateNowPlaying: function (song, songs) {
               this.currentSong = song;

               var artist = song.get('metadata').artist, 
               title = song.get('metadata').song, 
               coverart = 'url('+(song.get('metadata').coverart||'https://s3.amazonaws.com/static.turntable.fm/images/room/record.png')+')' , 
               bitrate = (song.get('metadata').bitrate||128)+'kbps';
               
               $(remix.nodes.artist).text(artist).attr('title', artist);
               $(remix.nodes.title).text(title).attr('title', title);
               $(remix.nodes.coverart).css('background-image', coverart);
               $(remix.nodes.coverartGlow).css('background-image', coverart);
               $(remix.nodes.bitrate).text(bitrate).attr('title', bitrate);
               
               $('.upvotes, .downvotes, .queues').text(0).removeClass('active');
               
               $('.headback, .headfront').removeClass('rock');
               
               if (util.getSetting('autoAwesome')=='on') {
                   setTimeout(function() {
                       $(window).focus();
                       turntable.room.manager.callback('upvote');
                    }, Math.round(Math.random()*30000));
               }
            }
        });
        
        Song = Backbone.Model.extend({
            initialize: function () {
                this.set({queues: 0});
                this.on('change:upvotes', function(model, upvotes) {
                    $(remix.nodes.upvotes).text(upvotes);
                });
                this.on('change:downvotes', function(model, downvotes) {
                    $(remix.nodes.downvotes).text(downvotes);
                });
                this.on('change:queues', function(model, queues) {
                    $(remix.nodes.queues).text(queues);
                });
            }, 
            updateVotes: function (data) {
                turntable.room.updateGuestList();
                this.set({
                    upvotes: data.upvotes, 
                    downvotes: data.downvotes
                });
            }, 
            updateQueues: function () {
                this.set({
                    queues: this.get('queues') + 1
                });
            }
        });
        
        Users = Backbone.Collection.extend({
            model: User, 
            initialize: function () {
                this.on('add', function(user) {
                    user.set('id', user.get('userid'));
                });
            }
        });
        
        User = Backbone.Model.extend({
            initialize: function () {
                this.set({ lastActivity: Date.now() });
            }
        });
        
        Room = Backbone.Model.extend({
            songs: new Songs, 
            users: new Users, 
            initialize: function () {
                //console.log('Setting up room..');
                $('#top-panel, #right-panel').click(function() {
                    return turntable.room.removeGuestListMenu.
                            bind(turntable.room)();
                });
                $('#right-panel').
                    append(util.buildTree(this.layouts.bottomBar()));
                $('#right-panel').
                    append(util.buildTree(this.layouts.settingsPanel()));
                $('#right-panel').
                    append(util.buildTree(this.layouts.activityPanel, remix.nodes));
                $('.guest-list-container').addClass('active');
                $('.guest-list-container, #buddyListContainer,' +
                  '#room-info-tab, #playlist').addClass('pane');
                $('#room-info-tab').appendTo('body');
                $('#privateChatIcon').off('click');
                $('.info .room').append(util.buildTree(this.layouts.roomButtons()));
                $('body').append(util.buildTree(this.layouts.nowPlaying.bind(this)(), remix.nodes));
                $('<div class="tab selected">').html('Room Chat').appendTo($('.chat-container .chatHeader'));
                //$('<div class="tab">').html('Test Tab').appendTo($('.chat-container .chatHeader'));
            }, 
            upvote: function () {
                remix.verifyAction(turntable.messageId, 'upvote');
                turntable.room.manager.callback('upvote');
            }, 
            downvote: function () {
                remix.verifyAction(turntable.messageId, 'downvote');
                turntable.room.manager.callback('downvote');
            }, 
            queue: function () {
                remix.verifyAction(turntable.messageId, 'queue');
                turntable.room.manager.callback('add_song_to', 'queue');
            }, 
            applyTooltips: function () {
                turntable.room.manager.tiny_tooltip($('.buttons .playlist'), 'Playlist');
                turntable.room.manager.tiny_tooltip($('.buttons .listeners'), 'Listeners');
                turntable.room.manager.tiny_tooltip($('.buttons .buddies'), 'Buddy List');
                turntable.room.manager.tiny_tooltip($('.buttons .roomInfo'), 'Room Info');
                turntable.room.manager.tiny_tooltip($('.buttons .activity'), 'Activity Log');
                turntable.room.manager.tiny_tooltip($('.buttons .settings'), 'Settings');
            }, 
            updateSongCount: function () {
                var songCount = turntable.playlist.files.length;
                $('#playlist .header-text').text('My DJ Queue ('+songCount+')');
            }, 
            updateTitle: function(n) {
                if (!n) { 
                    n = '';
                }
                else {
                    n = n + ' ';
                }
                document.title = n + turntable.room.name + ' - turntable.fm';
            }, 
            layouts: {
                'activityPanel': [
                    'div.activity-container.pane##activityPanel', 
                    {}, 
                    ['div.black-right-header', {}, 
                        ['div.header-text', {}, 'Activity Log']
                    ], 
                    ['div.content', {}, 
                        ['ul#activity##activities', {}, '']
                    ]
                ], 
                'activities': {
                    'newsong': function(d) {
                        var md = d.room.metadata.current_song,
                            song = md.metadata;
                        return ['li', {}, md.djname + ' started playing "' + song.song + '" by ' + song.artist + '.'];
                    }, 
                    'registered': function(d) {
                        var user = d.user[0];
                        return ['li', {}, user.name + ' joined the room.'];
                    }, 
                    'deregistered': function(d) {
                        var user = d.user[0];
                        return ['li', {}, user.name + ' left the room.'];
                    }, 
                    'update_user': function(d) {
                        var user = remix.room.users.get(d.userid).get('name');
                        if (d.hasOwnProperty('fans')) {
                            return ['li', {}, user + ' '+ ((d.fans == 1)?'gained':'lost') +' a fan.'];
                        }
                        else if (d.hasOwnProperty('avatarid')) {
                            return ['li', {}, user + ' changed avatars.'];
                        }
                        else if (d.hasOwnProperty('name')) {
                            if (d.name!=user) {
                                remix.room.users.get(d.userid).set({name: d.name});
                                return ['li', {}, user + ' is now known as ' + d.name + '.'];
                            }
                            return ['li', {}, user + ' modified their profile.'];
                        }
                    }, 
                    'update_votes': function(d) {
                        var vote = d.room.metadata.votelog[0];
                        if (vote[0]) {
                            var user = remix.room.users.get(vote[0]).get('name');
                            return  ['li', {}, user + ' ' + vote[1] + 'voted.'];
                        }
                        else {
                            return ['li', {}, 'Anonymous user downvoted.'];
                        }
                    }, 
                    'add_dj': function(d) {
                        var user = remix.room.users.get(d.user[0].userid).get('name');
                        return ['li', {}, user + ' became a DJ.'];
                    }, 
                    'rem_dj': function(d) {
                        var user = remix.room.users.get(d.user[0].userid).get('name');
                        if (d.modid) {
                            var mod = remix.room.users.get(d.modid).get('name');
                            return ['li', {}, mod + ' escorted ' + user + ' off the deck.'];
                        }
                        return ['li', {}, user + ' is no longer DJing.'];
                    }, 
                    'new_moderator': function(d) {
                        var user = remix.room.users.get(d.userid).get('name');
                        return ['li', {}, user + ' is now a moderator.'];
                    }, 
                    'rem_moderator': function(d) {
                        var user = remix.room.users.get(d.userid).get('name');
                        return ['li', {}, user + ' is no longer a moderator.'];                        
                    }, 
                    'booted_user': function(d) {
                        var mod = remix.room.users.get(d.modid).get('name').
                            user = remix.room.users.get(d.userid).get('name');
                        return ['li', {}, mod + ' booted ' + user + ' from the room.'];
                    }, 
                    'update_room': function(d) {
                        return ['li', {}, 'Room description changed.'];
                    }, 
                    'snagged': function(d) {
                        var user = remix.room.users.get(d.userid).get('name');
                        return ['li', {}, user + ' added to playlist.'];
                    }, 
                }, 
                'bottomBar': function () {
                    var buttonClick = function (pane) {
                        return {
                            event: {
                                click: function () {
                                    var p = '#privateChatIcon',
                                        b = '#bottom-bar .buttons div';
                                    if (pane === '#buddyListContainer') {
                                        $(p).addClass('open');
                                    }
                                    else {
                                        $(p).removeClass('open');
                                    }
                                    $(b).removeClass('active');
                                    $('.pane').removeClass('active');
                                    $(this).addClass('active');
                                    return $(pane).addClass('active');
                                }
                            }
                        };
                    };
                    return ['div#bottom-bar', {}, 
                        ['div.buttons', {}, 
                            ['div.btn.playlist', 
                            buttonClick('#playlist'), 
                            ''], 
                            ['div.btn.listeners.active', 
                            buttonClick('.guest-list-container'), 
                            ''], 
                            ['div.btn.buddies', 
                            buttonClick('#buddyListContainer'), 
                            ''], 
                            ['div.btn.roomInfo', 
                            buttonClick('#room-info-tab'), 
                            ''], 
                            ['div.btn.activity', 
                            buttonClick('.activity-container'), 
                            ''], 
                            ['div.btn.settings', 
                            buttonClick('.settings-container'), 
                            '']
                        ]
                    ];
                }, 
                'nowPlaying': function () {
                    return [
                        'div#nowPlaying##nowPlaying', {}, 
                        ['div.artist', {}, 
                            ['label', {}, 'Artist:'], 
                            ['span##artist', {}, '']
                        ], 
                        ['div.title', {}, 
                            ['label', {}, 'Title:'], 
                            ['span##title', {}, '']
                        ], 
                        ['div.bitrate', {}, 
                            ['label', {}, 'Bitrate:'], 
                            ['span##bitrate', {}, '']
                        ], 
                        ['div.cover##coverart', {}, ''], 
                        ['div.coverGlow##coverartGlow', {}, ''], 
                        [
                            'div.stats', {}, [
                                'div.upvotes##upvotes', {
                                    event: {
                                        click: this.upvote
                                    }
                                }, '0'
                                ], [
                                'div.downvotes##downvotes', {
                                    event: {
                                        click: this.downvote
                                    }
                                }, '0'
                                ], [
                                'div.queues##queues', {
                                    event: {
                                        click: this.queue
                                    }
                                }, '0'
                            ]
                        ]
                    ];
                }, 
                'roomButtons': function () {
                    return [
                        'span', {}, [
                            'div.list', {
                                event: {
                                    click: turntable.room.listRoomsShow
                                },
                                title: 'List Rooms'
                            }, ''
                            ], [
                            'div.random', {
                                event: {
                                    click: turntable.randomRoom
                                },
                                title: 'Random Room'
                            }, ''
                        ]
                    ];
                }, 
                'settingsPanel': function (a) {
                    var menuItems;
                    menuItems = ['div.content', {}];
                    $('#menuh > div + div').each(function () {
                        var item;
                        item = [
                            'div.btn', {
                                event: {
                                    click: $(this).data('events').click[0].handler
                                }
                            }, $(this).text()
                        ];
                        return menuItems.push(item);
                    });
                    return ['div.settings-container.pane'+((a)?'.active':'')+'#settingsPanel', {}, 
                                ['div.black-right-header', {},['div.header-text', {}, 
                                    'Settings',
                                    ['a.refresh', {
                                        href: '#',
                                        event: {
                                            click: function() {
                                                console.log('refreshing');
                                                $('#settingsPanel').remove();
                                                $('#right-panel').
                                                    append(util.buildTree(remix.room.layouts.settingsPanel(true)));
                                                return false;
                                            }
                                        }
                                    }, 'Refresh']
                                ]], 
                                menuItems, 
                                ['div.options', {}, 
                                    ['input#autoAwesome.toggle', {
                                        type: 'range', 
                                        min: 0, 
                                        max: 1, 
                                        value: ((util.getSetting('autoAwesome')=='on')?1:0), 
                                        event: { 
                                            click: function () {
                                                $(this).val((($(this).val()==1)?0:1))
                                            }, 
                                            change: function () {
                                                if ($(this).val()==1) {
                                                    return util.setSetting('autoAwesome', 'on');
                                                } 
                                                return util.setSetting('autoAwesome', 'off');
                                            }
                                        }
                                    }, ''], 
                                    ['label', {for: 'autoAwesome'}, 'Auto-Awesome']
                                ],
                                
                            ];
                }, 
                'guestListName': function(b, f, c) {
                    var a = "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/" + b.avatarid + "/scaled/55/headfront.png";
                    var e = c ? ".guest.selected" : ".guest";
                    var g = ['div.icons', {}];
                    if (b.acl>0) { 
                        g.push(['div.superuser']); 
                    }
                    if (turntable.room.djIds.indexOf(b.userid)>=0) {
                        g.push(['div.dj']);
                    }
                    if (turntable.room.moderators.indexOf(b.userid)>=0) {
                        g.push(['div.mod']);
                    }
                    if (b.fanof) {
                        g.push(['div.fan']);
                    } 
                    if (g.length==2) {
                        g='';
                    }
                    var v = (turntable.room.upvoters.indexOf(b.userid)>=0)?'.awesome':'';
                    return ["div" + e + v + '##'+b.userid, {
                        event: {
                            mouseover: function() {
                                $(this).find("div.guestArrow").show();
                            },
                            mouseout: function() {
                                $(this).find("div.guestArrow").hide();
                            },
                            click: function() {
                                var g = $(this).parent().find("div.guestOptionsContainer");
                                var h = $(this);
                                if (!g.length) {
                                    $.proxy(function() {
                                        this.addGuestListMenu(b, h);
                                    }, f)();
                                } else {
                                    if ($(this).hasClass("selected")) {
                                        f.removeGuestListMenu();
                                    } else {
                                        f.removeGuestListMenu($.proxy(function() {
                                            this.addGuestListMenu(b, h);
                                        }, f));
                                    }
                                }
                            }
                        },
                        data: {
                            id: b.userid
                        }
                    }, ["div.guestAvatar",
                    {}, ["img",
                    {
                        src: a,
                        height: "20"
                    }]], ["div.guestName",
                    {},
                    b.name], ["div.guestArrow"], g];
                }
            }
        });
        
        window.remix = new Remix();

    });

})(jQuery, window);