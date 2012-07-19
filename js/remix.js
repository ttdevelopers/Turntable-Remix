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
            
            var keys = Object.keys(turntable);
            turntable.api = turntable[keys[keys.indexOf('getHashedAddr') + 1]];
            
            turntable.socket.on('message', this.messageListener.bind(this));

            this.load = load = function () {
                if (!turntable.hasOwnProperty('room')) {
                    for (var i in turntable) {
                        if (turntable.hasOwnProperty(i) && turntable[i] && turntable[i].hasOwnProperty('selfId')) {
                            turntable.room = turntable[i];
                            console.log('Found room object.');
                            this.room = new Room;
                        }
                    }
                }
                if (turntable.hasOwnProperty('room') && !turntable.room.hasOwnProperty('manager')) {
                    for (var i in turntable.room) {
                        if (turntable.room.hasOwnProperty(i) && turntable.room[i] && turntable.room[i].hasOwnProperty('myuserid')) {
                            turntable.room.manager = turntable.room[i];
                            console.log('Found manager object.');
                            if (turntable.room.currentSong) {
                                this.room.songs.add(new Song(turntable.room.currentSong));
                                this.room.applyTooltips();
                            }
                        }
                    }
                }
                if (!turntable.hasOwnProperty('room') || turntable.hasOwnProperty('room') && !turntable.room.hasOwnProperty('manager')) {
                    setTimeout(this.load.bind(this), 100);
                }
                else {
                    console.log('Found room and manager objects.');
                }
            };
            
            this.load();
        }
        
        Remix.prototype.messageListener = function (data) {
            var data = JSON.parse(data);
            
            if (data.command!==undefined) {
                if (this.events.hasOwnProperty(data.command)) {
                    return this.events[data.command].bind(this)(data);
                }
                console.log(data.command, data);
            }
            else if (data.hasOwnProperty('list')) {
                this.room.updateSongCount();
            }
            else if (data.hasOwnProperty('room') && data.hasOwnProperty('users')) {
                console.log('Room info: %o', data);
                setTimeout(function (metadata) {
                    this.room.songs.currentSong.updateVotes(metadata);
                }.bind(this), 250, data.room.metadata);
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
                    console.log(data);
                }
            }
            else {
                console.log(data);
            }
        };
        
        Remix.prototype.events = {
            'newsong': function (data) {
                console.log('new song', data.room.metadata.current_song);
                this.room.songs.add(new Song(data.room.metadata.current_song));
            }, 
            'registered': function (data) {
                console.log('user joined', data, this);
                this.room.users.add(new User(data.user[0]));
            }, 
            'playlist_complete': function (data) {
                this.room.updateSongCount();
            }, 
            'snagged': function (data) {
                console.log(data);
                this.room.songs.currentSong.updateQueues();
            }, 
            'update_votes': function (data) {
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
               $(remix.nodes.artist).text(song.get('metadata').artist);
               $(remix.nodes.title).text(song.get('metadata').song);
               $(remix.nodes.album).text(song.get('metadata').album);
               $(remix.nodes.bitrate).text((song.get('metadata').bitrate||128)+'kbps');
               $('.upvotes, .downvotes, .queues').text(0).removeClass('active');
               if (remix.autobop) {
                   $(window).focus();
                   turntable.room.manager.callback('upvote');
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
                console.log('Setting up room..');
                $('#top-panel, #right-panel').click(function() {
                    return turntable.room.removeGuestListMenu.
                            bind(turntable.room)();
                });
                $('#right-panel').
                    append(util.buildTree(this.layouts.bottomBar()));
                $('#right-panel').
                    append(util.buildTree(this.layouts.settingsPanel()));
                $('#right-panel').
                    append(util.buildTree(this.layouts.activityPanel));
                $('.guest-list-container').addClass('active');
                $('.guest-list-container, #buddyListContainer,' +
                  '#room-info-tab, .playlist-container').addClass('pane');
                $('#room-info-tab').appendTo('body');
                $('.pmGreyTop').off('click');
                $('.info .room').append(util.buildTree(this.layouts.roomButtons()));
                $('body').append(util.buildTree(this.layouts.nowPlaying.bind(this)(), remix.nodes));
            }, 
            upvote: function () {
                if ($('.upvotes').hasClass('active')) {
                    remix.autobop = true;
                    $('.upvotes').addClass('auto');
                    return;
                }
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
                $('.playlist-container .header-text').text('My DJ Queue ('+songCount+')');
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
                            buttonClick('.playlist-container'), 
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
                        ['div.album', {}, 
                            ['label', {}, 'Album:'], 
                            ['span##album', {}, '']
                        ], 
                        ['div.bitrate', {}, 
                            ['label', {}, 'Bitrate:'], 
                            ['span##bitrate', {}, '']
                        ], [
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
                'settingsPanel': function () {
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
                    return ['div.settings-container.pane#settingsPanel', {}, ['div.black-right-header', {}, ['div.header-text', {}, 'Settings']], menuItems];
                }
            }
        });
        
        window.remix = new Remix();

    });

})(jQuery, window);