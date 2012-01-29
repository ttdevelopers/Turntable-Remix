(function(window, undefined) {
  //var $this;
  versionCheck = function(a) {
    if (a.version!=$this.version) {
      var updateMessage = ['div', ['strong', 'Turntable Remix Update Available'], ['div', 'Your currently have version '+$this.version, ['br'], ['a', {href: 'http://github.com/overra/Turntable-Remix'}, 'Click here'], ' to get the latest version!', ['br'], ['br'], 'Clicking OK to ignore.']]
      turntable.showAlert(util.buildTree(updateMessage))
    }
  }
  var TT = Backbone.Model.extend({
    version: '0.1.5',
    initialize: function() {
      $this = this;
      
      this.listeners = new Listeners();
      
      var loading = [
        'ul.loading',
          ['li', ['img', {src: "https://s3.amazonaws.com/static.turntable.fm/images/room/turntable_logo.png"}]], 
          ['li', 'Contacting Turntable']
      ];
      
      $('body').append(util.buildTree(loading));
      
      turntable.socket.on('message', function(a) { $this.events.received(a) });
          
      this.findObjects();
      
      $(window).resize(function() {
        clearTimeout(window.resizeTimer)
        window.resizeTimer = setTimeout(function(a,b) {
          if (a.height()==$(window).height()&&a.width()==$(window).width()) {
          	b.resize();
          }
        }, 1000, $(window), $this)
      });
    },
    findObjects: function() {
      tt=turntable;
      $('.loading li:last').html(function(a,b) { $(this).html(b+'.') });
      if (!tt.room) {
        for (i in tt) {
          if (tt[i]&&tt[i].selfId) {
            $('.loading').append(util.buildTree(['li', 'Setting up room..']));
            tt.room=tt[i];
          }
        }
      }
      if (tt.room&&!tt.room.manager) {
        for (i in tt.room) {
          if (tt.room[i]&&tt.room[i].myuserid) {
            tt.room.manager = tt.room[i];
          }
        }
      }
      if (!tt.room||!tt.room.manager) { 
        setTimeout(function(a){ 
          a.findObjects() 
        }, 500, this) 
      } 
      else {
        this.setup();
      }
    },
    setup: function() {
      this.now = now;
      delete now;
    
      $('<img src="http://i.imgur.com/BfJU2.png" id="konami">').css({position: 'absolute', left: '50%', marginLeft: '-300px', bottom: '-244px', width: '300px', zIndex: 2}).appendTo('#right-panel');
      var konami = new Konami();
      konami.code = function() {
        $('#konami').animate({bottom: '200px'}, 1000, function(){ setTimeout(function(a) { a.animate({bottom: '-244px'}, 5000) }, 2000, $(this)) })
      }
      konami.load();
    
      // Add missing speaker states? (see speaker.states)
      speaker.states.on.push(['lspeaker2',0,0]);
      speaker.states.on.push(['lspeaker3',0,0]);
      
      // Copy element location arrays
      var copyArr=function(a){return a.slice(0)};    
      this.ui = {
        room_props: room_props.map(copyArr),
        speakerStates: speaker.states.on.map(copyArr),
        laptop_locations: laptop_locations.map(copyArr),
        record_pile_locations: record_pile_locations.map(copyArr),
        becomedj_locations: becomedj_locations.map(copyArr),
        dj_locations: dj_locations.map(copyArr),
        spotlight_locations: spotlight_locations.map(copyArr)
      }
      // Bind click event to Chat Minimize 
      $('.chat-container .chatResizeIcon').click(function() {
        $(this).toggleClass('minimized');
        if ($('.chat-container .messages').height()=='0') {
          $('.chat-container').animate({height: $this.roomHeight*.4}, 1000)
          $('.chat-container .messages').animate({height: $this.roomHeight*.4-38-25}, 1000, function() {
            $('.chat-container .messages').scrollTop(99999);          
          })
          $('.chat-container .chatHeader').animate({bottom: $this.roomHeight*.4-25}, 1000)
        }
        else {
          $('.chat-container').animate({height: 38+25}, 1000)
          $('.chat-container .messages').animate({height: 0}, 1000)
          $('.chat-container .chatHeader').animate({bottom: 38}, 1000)
        }
      })
      // Append Bottom Bar
      $('<div class="bottom-bar">').appendTo('#right-panel');
  
  		// Move Room Info and Song Log
  		$('#top-panel .info').addClass('info-container').prependTo('#right-panel');
  		$('#top-panel #room-info-tab').addClass('songlog-container').appendTo('#right-panel');
  		
  		// Add panel class to panels
  		$('.songlog-container .infowrap + div, .playlist-container, .guest-list-container').addClass('panel');
  		
  		// Add Room Info Description Btn Event
  		$('.edit-description-btn').click(function(){ $('.edit-description textarea').focus() })
  		
  		// Room Info click event
  		$('.info-container .room').click(function() { $('.infowrap').toggle() })
      
      currentSong = (tt.room.currentSong)?tt.room.currentSong.metadata:0;
      var upvoteClickEvent = function() { 
        if ($(this).hasClass('active')) {
          if ($this.autoAwesome) {
            $this.autoAwesome=false;
            $(this).removeClass('auto');
          } 
          else {
            $this.autoAwesome=true; 
            $(this).addClass('auto');
          }
        } 
        else { 
          $('#downvotes').removeClass('active'); 
          $(this).addClass('active'); 
          tt.room.manager.callback('upvote'); 
        } 
      };
      var queueClickEvent = function() {
        $(this).addClass('active');
        tt.room.manager.callback('add_song_to', 'queue');
      }
      var currentSong = [
        'div.currentSong', 
          ['div#artist.info', 'Artist: ', ['span', (currentSong.artist||'')]],
          ['div#title.info', 'Title: ', ['span', (currentSong.song||'')]],
          ['div#bitrate.info', 'Bitrate: ', ['span', (currentSong)?(currentSong.bitrate||128)+'kbps':'']],
          ['div#listeners.count', {event: {click: function() { $('.panelButtons li').removeClass('active'); $('.panelButtons .guestList').addClass('active'); $('.panel.active').removeClass('active'); $('.guest-list-container').addClass('active');  }}}, this.listeners.length],
          ['div#upvotes.count', {event:{click: upvoteClickEvent}}, (this.currentSong)?this.currentSong.get('upvotes'):0],
          ['div#downvotes.count', {event:{click: function() { $('#upvotes').removeClass('active'); $(this).addClass('active'); tt.room.manager.callback('downvote'); }}}, (this.currentSong)?this.currentSong.get('downvotes'):0],
          ['div#queues.count', {event:{click: queueClickEvent}}, '0'],
      ];

      $('.info-container').append(util.buildTree(currentSong));

      if (this.currentSong) { var hasVoted = this.currentSong.get('hasVoted'); }
      if (hasVoted) { $('#'+hasVoted+'votes').addClass('active'); }
      
      
  		// Creating Panel Buttons UI Tree
  		var panelButtons = [
  		  'ul.panelButtons', 
  		  ['li.myQueue', {event: {click: function(){ 
  		    $(this).siblings().removeClass('active'); 
  		    $(this).addClass('active');
  		    $('.panel.active').removeClass('active'); 
  		    $('.playlist-container').addClass('active'); 
  		  } } }, 'Playlist'],
  		  ['li.recentSongs', {event: {click: function(){ 
  		    $(this).siblings().removeClass('active'); 
  		    $(this).addClass('active');
  		    $('.panel.active').removeClass('active'); 
  		    $('.songlog-container .panel').addClass('active'); 
  		  } } }, 'Recent'],
  		  ['li.guestList', {event: {click: function(){ 
  		    $(this).siblings().removeClass('active'); 
  		    $(this).addClass('active');
  		    $('.panel.active').removeClass('active'); 
  		    $('.guest-list-container').addClass('active'); 
  		  } } }, 'Listeners'],
  		  ['li.activityLog', {event: {click: function(){ 
  		    $(this).siblings().removeClass('active'); 
  		    $(this).addClass('active');
  		    $('.panel.active').removeClass('active'); 
  		    $('.activity-log-container').addClass('active'); 
  		  } } }, 'Log'],
  		  ['li.settings', {event: {click: function(){ 
  		    $(this).siblings().removeClass('active'); 
  		    $(this).addClass('active');
  		    $('.panel.active').removeClass('active'); 
  		    $('.settings-container').addClass('active'); 
  		  } } }, 'Settings'],
  		];
  		$('.bottom-bar').append(util.buildTree(panelButtons));
  		
  		// Create Buddylist Container
  		//$('<div class="buddylist-container">').insertBefore('.chat-container .chatBar');
  		
      // Create Activity Log
      var activityLog = [
        'div.activity-log-container.panel', 
          ['div.title', 'Activity Log'],
          ['ul#activityLog', '']
      ];
      $('#right-panel').append(util.buildTree(activityLog))

      // Create Settings Panel
      var settingsPanel = function(a,b) {
        var notifyLabels = [
          'When someone I fanned starts DJing',
          'When someone becomes a fan of me',
          'About new features, news, etc',
          'At random times with pieces of pi',
        ];
        var facebookLabels = [
          'When I awesome in public rooms',
          'When I join a public room',
          'When I DJ in a public room'
        ];
        var notifyContent = [], 
            facebookContent=[];
        $(a).each(function(i) {
          notifyContent.push([
            'div.option',
            ['input', {type: 'checkbox', name: $(this).attr('name'), id: $(this).attr('name'), checked: $(this).attr('checked') }],
            ['label', {for: $(this).attr('name')}, notifyLabels[i]]
          ])
        })
        notifyContent.splice(0,0,['div.sectionTitle', 'Email me..'])
        notifyContent.splice(0,0,'div.section')

        $(b).each(function(i) {
          facebookContent.push([
            'div.option',
            ['input', {type: 'checkbox', name: $(this).attr('name'), id: $(this).attr('name'), checked: $(this).attr('checked') }],
            ['label', {for: $(this).attr('name')}, facebookLabels[i]]
          ])
        })
        facebookContent.splice(0,0,['div.sectionTitle', 'Publish to Facebook..'])
        facebookContent.splice(0,0,'div.section')

        return [
          'div.content', 
          [
            'form#emailSettings', 
            {event: {submit: function(){
          		$.post('/settings', $(this).serialize(), function() {
          		  tt.room.showRoomTip('Settings saved..', 2);
          		});
          		return false;
            }} },
            notifyContent,
            facebookContent,
            ['button', {type: 'submit'}, 'Save Settings']
          ]
        ]
      };
      $('#right-panel').append(util.buildTree([
        'div.settings-container.panel',
          ['div.title', 'Settings']
      ]))                
      getSettings = function() { return $.get('/settings') }
			$.when(getSettings()).then(function(a) {
        var c = $(a).find('input[name*=notify]')
        var b = $(a).find('input[name*=facebook]')
        $('.settings-container').append(util.buildTree(settingsPanel(c,b)));

			})	
			
  		// Set Active Panel and Panel Button
  		$('.guest-list-container, .panelButtons .guestList').addClass('active');
      // Overwrite setPage method
      turntable.setPage = function(a,b) {
        window.location = '/'+ (a||b);
      }
      
      // Idletime format function
      var formatIdletime = function(diff) { 
        hour = (diff>=3600)?Math.floor(diff / 3600):'00';
        minutes = (hour!='00')?Math.floor((diff-(hour*3600))/60):(diff>=60)?Math.floor(diff/60):'00';
        seconds = diff - (((hour!='00')?hour*3600:0) + ((minutes!='00')?minutes*60:0)); 
        return ((hour!='00')?hour+':':'')+((minutes.toString().length==2)?minutes:'0'+minutes)+':'+((seconds.toString().length==2)?seconds:'0'+seconds);
      }
      
      // Overwrite guest list name layout method
      Room.layouts.guestListName = function(b, f, c) {
        var a = "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/" + b.avatarid + "/scaled/55/headfront.png";
        var e = c ? ".guest.selected" : ".guest";
        var d = "";
        if (f.isSuperuser(b.userid)) {
          d = ".superuser";
        } else {
          if (f.isMod(b.userid)) {
            d = ".mod";
          }
        }
        var uT = getType(b, true);
        for (i in uT) {
          uT[i] = ['div.'+uT[i]];
        }
        var v = ((tt.room.downvoters.indexOf(b.userid)>=0)?'.downvoted':((tt.room.upvoters.indexOf(b.userid)>=0)?'.upvoted':''))
        uT.splice(0,0,'div.icons');
        currentIdletime = $this.listeners.get(b.userid)&&moment().diff(moment($this.listeners.get(b.userid).get('lastActivity')), 'seconds');
        var g = uT;
        return ["div"+ e+v, {
          event: {
            mouseover: function() {
              $(this).find("div.guestArrow").show();
              $(this).find('div.icons').css({opacity: 0});
              var updateIdleDisplay = function(a,b){
                var user = b;
                if (!$this.listeners.get(user.userid)) {
                  clearInterval(a.timer);
                  return;
                }
                var idletime = moment().diff(moment($this.listeners.get(user.userid).get('lastActivity')), 'seconds');
                $(a).find('div.idleTime').html(formatIdletime(idletime))
              }
              updateIdleDisplay(this,b);
              this.timer = setInterval(updateIdleDisplay, 1000, this,b)
            },
            mouseout: function() {
              $(this).find("div.guestArrow").hide();
              $(this).find('div.icons').css({opacity: 1});
              $(this).find('div.idleTime').html('')
              clearInterval(this.timer)
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
          height: "20",
          style: {
            opacity: ((currentIdletime>300)?((currentIdletime>600)?((currentIdletime>900)?0.15:0.40):0.65):1)
          }
        }]], ["div.guestName",
        {},
        b.name], g, ['div.idleTime'], ["div.guestArrow"]];
      }
      
      // Overwrite current Guest List sorting method
      var userTypes = ['verified', 'superuser', 'superuser', 'mod', 'dj', 'fan', 'listener'];
      var getType = function (a,d) {
      	var b = 6; 
      	var c = [6];
      	if (tt.user.fanOf.indexOf(a.userid)>=0) { b = 5; c.splice(0,0,5); }
      	if (a['verified']) { b = 0; c.splice(0,0,0); }
      	if (a.acl>1) { b = 1; c.splice(0,0,1); }
      	if (a.acl==1) { b = 2; c.splice(0,0,2); }
      	if (tt.room.moderators.indexOf(a.userid)>=0) { b = 3; c.splice(0,0,3); }
      	if (tt.room.djIds.indexOf(a.userid)>=0) { b = 4; c.splice(0,0,4); }
      	if (d) {
      	  c=c.map(function(a) { return userTypes[a]; })
      	}
      	return (d)?c:b;
      }
      tt.room.snags=0;
      
      tt.room.updateGuestList = function () {
          var b = [],
              g = $(".guest-list-container .guests");
          for (var f in this.users) {
              b.push(this.users[f]);
          }
      	b.sort(function (j, i) { 
          var h = getType(j),
              k = getType(i);
          if (h==k) {
            if (h==4) {
              h = tt.room.djIds.indexOf(j.userid);
              k = tt.room.djIds.indexOf(i.userid);
            }
            else {
              h = j.name.toLowerCase();
              k = i.name.toLowerCase();
            }
          }
          return (k > h) ? -1 : (k < h) ? 1 : 0;
      	});
        var c = g.find(".guest.selected").data("id");
        g.find(".guest").remove();
        for (var e = 0, a = b.length; e < a; e++) {
            var d = (c && c == b[e].userid) ? true : false;
            g.append(util.buildTree(Room.layouts.guestListName(b[e], this, d)));
        }
        $("span#totalUsers").text(b.length);
        this.updateGuestListMenu();
      }	
      tt.room.updateGuestList()
      //tt.api({api:'room.directory_graph'})
      // Initial resize
      this.resize();
      
      // Unbind .chatHeader mousedown event
      $('.chatHeader').unbind('mousedown');
      
      // Hide loading screen, show room
      $('#outer, .loading').toggle();
      
      $.ajax({
        url: 'http://turntableremix.com/version',
        dataType: 'jsonp'
      })
    },
    resize: function() {
      var height = $(window).height(),
          width = $(window).width(),
          roomWidth = this.roomWidth = width - 300,
          roomHeight = this.roomHeight = height - 60;
      
      // Resize
      $('#right-panel').css({height: roomHeight })                      // Right Panel
      $('#top-panel + div').css({                                       // Room Element
        width: roomWidth, 
        height: roomHeight
      });
      $('.playlist-container').css({height: roomHeight-39-150});                      // Playlist Container
      $('.playlist-container .mainPane').css({height: roomHeight-25-39-150});         // Playlist .mainPane Elements
      $('.playlist-container .songlist').css({height: roomHeight-25-68-39-150});      // Playlist .songlist Elements
      $('.guest-list-container').css({height: roomHeight-39-150});                    // Guest List Container
      $('.guest-list-container .guests').css({height: roomHeight-25-39-150});         // Guest List .guests Element
      $('.songlog-container .panel').css({height: roomHeight-39-150});                // Songlog Panel Element
      $('.songlog-container .panel .songlog').css({height: roomHeight-39-25-150});    // Songlog Element
      $('.activity-log-container').css({height: roomHeight-39-150});                  // Activity Log Container
      $('.activity-log-container #activityLog').css({height: roomHeight-39-25-150});  // Songlog Panel Element
      $('.settings-container').css({height: roomHeight-39-150});                      // Settings Container
      $('.settings-container .content').css({height: roomHeight-39-150-25});          // Settings Content Element
      $('.chat-container').css({height: roomHeight*.4});                              // Chat Container
      $('.chat-container .messages').css({height: roomHeight*.4-38-25});              // Chat Messages Element
      //$('.buddylist-container').css({height: roomHeight*.4-38-25});                 	// Buddylist Container
      $('.chat-container .chatHeader').css({bottom: roomHeight*.4-25});               // Chat Header Element
  
          
      // Reposition
      $('.chat-container').css({left: (roomWidth-600)/2 });             // Chat Container
      $('.profile').css({left: 100 });                    // Profile
  		$('.logo').css({left: (roomWidth-600)/2});                        // Logo
  		$('.userauthContainer').css({left: (roomWidth/2)+180});           // Settings 
      $('.roomTip').css({left: (roomWidth-408)/2});                     // Room Tip
      
      // Redefine room floor rects
      tt.room.manager.floorRects = [
        { rect: [Math.round(roomWidth*.1), 245, Math.round(roomWidth*.2), 100], weight: .2 }, 
        { rect: [Math.round(roomWidth*.3), 295, Math.round(roomWidth*.4), 50], weight: .6 }, 
        { rect: [Math.round(roomWidth*.7), 245, Math.round(roomWidth*.2), 100], weight: .2 }
      ];
      
  		// Remove and replace avatars
  		for (i in tt.room.users) {                            
  		  var user = tt.room.users[i],
  		      id = user.userid;
  			if (tt.room.djIds.indexOf(id)<0) { 
  				tt.room.manager.rem_listener(user);
  				tt.room.manager.add_listener(user);
  				if (tt.room.upvoters.indexOf(id)>=0) {
  					tt.room.manager.update_vote(user, 'up');
  				}
  			}		
  		}
  		
  		// Remove room props
  		var roomProps = $('#top-panel + div img[src*="props"][style]');
  		for (i=0; i<roomProps.length; i++) { tt.room.manager.blackswan.remove_element(roomProps[i]); }
  		// Redefine positions	
  		for (i in room_props) { room_props[i][1]=this.ui.room_props[i][1]+((roomWidth-511)/2); }
  		// Insert props
  		tt.room.manager.blackswan.add_props(room_props.slice(2))
  		
  		// Reposition Speaker States
  		for (i in speaker.states.on) {
  			speaker.states.on[i][1]=((this.ui.speakerStates[i][0].substr(0,1)=='l')?0:427)+((roomWidth-511)/2);
  		}		
  
      // Reposition Laptop, Record Pile, Become DJ, DJ and Spotlight locations
  		var locations = ['laptop_locations', 'record_pile_locations', 'becomedj_locations', 'dj_locations', 'spotlight_locations']
  		for (i in locations) {
  			x=window[locations[i]];
  			o=this.ui[locations[i]];
  			for (j in x) {
  				x[j][0]=o[j][0]+((roomWidth-511)/2)
  			}
  		}
  		// Remove record piles
      $('.record_pile').each(function() { tt.room.manager.blackswan.remove_element(this); });
  		tt.room.manager.record_piles={};
  		
  		// Add record piles
  		for (var j = 0; j < tt.room.manager.dj_spots; ++j) {
  		    var k = $('<div class="record_pile"></div>');
  		    k.data("spot", j);
  		    if (j == 0) { k.hide(); }
  		    tt.room.manager.record_piles[j] = k;
  		    tt.room.manager.blackswan.add_element(k, record_pile_locations[j], 116);
  		}
  
      // Reposition Become DJ & Invite DJ Buttons
  		tt.room.manager.blackswan.add_element(tt.room.manager.invite_dj, becomedj_locations[0], 116, true);
  		tt.room.manager.blackswan.add_element(tt.room.manager.become_dj, becomedj_locations[0], 116, true);		
  				    
      // Remove & Replace DJs
  		for (i in tt.room.djIds) { 
  			tt.room.manager.rem_dj(i); 
  			tt.room.manager.add_dj(tt.room.users[tt.room.djIds[i]], i) 
  			if (tt.room.upvoters.indexOf(tt.room.djIds[i])>=0) {
  				tt.room.manager.update_vote(tt.room.users[tt.room.djIds[i]], 'up');
  			}
  		}
  		// Reset Current DJ
  		tt.room.manager.stop_active_dj();
  		tt.room.manager.set_active_dj(tt.room.djIds.indexOf(tt.room.currentDj))	
  		
  		// Repositioning the Songboard
  		$('#songboard_hotspot').css({left: ((roomWidth-511)/2)+84})	
  		tt.room.manager.blackswan.remove_element(tt.room.manager.songboard)
  		tt.room.manager.blackswan.add_element(tt.room.manager.songboard, [((roomWidth-511)/2)+84, 147], 116, true)				
  
  		// Reposition Speakers & Mute Volume Containers
  		$('#left_speaker').css({left: ((roomWidth-511)/2)})
  		$('#right_speaker').css({left: ((roomWidth-511)/2)+434})
  		$('.mv_container:nth(0)').css({left: ((roomWidth-511)/2)})
  		$('.mv_container:nth(1)').css({left: ((roomWidth-511)/2)+434})
  		tt.room.manager.blackswan.add_dancer(speaker, false, [((roomWidth-511)/2)+15, 194], false, false)
  		
  		// Reset Speaker State
  		tt.room.manager.speaker.state('off')
  		tt.room.manager.speaker.state('on')
    },
    events: {
      received: function(a) {
        b=JSON.parse(a);
        if (b.command&&this[b.command]) {
          this[b.command](b);
        }
        if (b.list) { 
          if (typeof b.list[0]=='string') { // Favorite Rooms
          } else { // Playlist data
          }
        }
        if (b.rooms) {
          var listTree=[]; 
          for (i in b.rooms) { 
            room = b.rooms[i]; 
            userTree = []; 
            if (room[1].length>0) { 
              for (j in room[1]) { 
                userTree.push(['li.'+room[1][j].status, room[1][j].name]); 
              } 
              userTree.splice(0,0,['li.room', room[0].name]); 
              listTree=listTree.concat(userTree); 
            } 
          } 
          listTree.splice(0,0,'ul'); 
          //$('.buddylist-container').html(util.buildTree(listTree));   
        }
        if (b.room&&!b.command) {
          var users = b.users;
          $this.currentSong = new CurrentSong();
          var currentSong = (b.room.metadata.current_song)?b.room.metadata.current_song.metadata:null;
          if (currentSong) {
            $this.currentSong.set({
              artist: currentSong.artist,
              title: currentSong.song,
              bitrate: (currentSong.bitrate||128)+'kbps',
              upvotes: b.room.metadata.upvotes,
              downvotes: b.room.metadata.downvotes
            })
          }
          tt.room.downvoters=[];
          votelog = b.room.metadata.votelog;
          console.log(votelog)
          voterIds = _.pluck(votelog, '0');
          voterIndex = voterIds.indexOf(tt.user.id);
          for (i in votelog) {
            if (votelog[i][1]=='down'&&votelog[i][0]!='') { tt.room.downvoters.push(votelog[i][0]); }
          }
          if (voterIndex>=0) {
            $this.currentSong.set({hasVoted: votelog[voterIndex][1]});
          }
          for (i in users) {
            $this.listeners.add(new Listener({id: users[i].userid, name: users[i].name}))
          }
        }
      },
      newsong: function(a) {
        $this.currentSong = new CurrentSong();
        var currentSong = a.room.metadata.current_song.metadata;
        var activity = ['li', {title: currentSong.song+' by '+currentSong.artist}, turntable.room.users[a.room.metadata.current_dj].name+' started playing '+currentSong.song+' by '+currentSong.artist+'.']
        $('.count').removeClass('active');
        $('#activityLog').prepend(util.buildTree(activity))     
        tt.room.downvoters=[];
        if ($this.autoAwesome) { 
          tt.room.manager.callback('upvote'); 
          $('#upvotes').addClass('active');
        }
        $this.currentSong.set({
          artist: currentSong.artist,
          title: currentSong.song,
          bitrate: (currentSong.bitrate||128)+'kbps'
        })
      },
      registered: function(a) {
        var users = b.user;
        for (i in users) {
          $this.listeners.add(new Listener({id: users[i].userid, name: users[i].name}))
        }
      },
      deregistered: function(a) {
        var users = b.user;
        for (i in users) {
          $this.listeners.remove($this.listeners.get(users[i].userid));
        }      
      },
      update_votes: function(a) {
        var votes = a.room.metadata.votelog;
        var room = a.room.metadata;      
        for (i in votes) {
          var vuid = votes[i][0],
              vdir = votes[i][1];
          var activity = ['li', ((turntable.room.users[votes[i][0]]&&turntable.room.users[votes[i][0]].name)||'Anonymous user')+' voted '+votes[i][1]+'.'];
          $('#activityLog').prepend(util.buildTree(activity));
          if (vdir=='up'&&tt.room.downvoters.indexOf(vuid)>=0) {
            tt.room.downvoters.splice(tt.room.downvoters.indexOf(vuid),1);
          }
          if (vdir=='down'&&vuid!='') {
            tt.room.downvoters.push(vuid)
          }
          if (vuid!='') { 
            $this.listeners.get(vuid).set({lastActivity: Date.now()})
          }
        }
        tt.room.updateGuestList();
        $this.currentSong.set({
          upvotes: room.upvotes,
          downvotes: room.downvotes
        })
      },
      speak: function(a) {
        $this.listeners.get(a.userid).set({lastActivity: Date.now()})
      },
      update_user: function(a) {
        var activity;
        if (a.fans) { 
          activity = ['li', turntable.room.users[a.userid].name+' '+((a.fans>0)?'gained':'lost')+' a fan.']; 
        }
        if (a.avatarid) { 
          avatar="https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/avatars/" + a.avatarid + "/scaled/55/headfront.png";
          activity = ['li',{'data-avatar': avatar}, turntable.room.users[a.userid].name+' changed their avatar.']; 
        }
        $('#activityLog').prepend(util.buildTree(activity))
      },
      snagged: function(a) {
        $this.currentSong.snag(a);
      },
      add_dj: function(a) {
        var activity = ['li', a.user[0].name+' became a DJ.'];
        $('#activityLog').prepend(util.buildTree(activity));
        tt.room.updateGuestList();
      },
      rem_dj: function(a) {
        var activity = ['li', a.user[0].name+' is no longer a DJ.'];
        $('#activityLog').prepend(util.buildTree(activity));
        tt.room.updateGuestList();
      }
    }
  })
  var Listeners = Backbone.Collection.extend({
    model: Listener,
    initialize: function() {
      this.bind('add', function(m,co){ 
        $('#listeners').html(_.size(co));
        var activity = ['li', m.get('name')+' joined the room.'];
        $('#activityLog').prepend(util.buildTree(activity))       
      });
      this.bind('remove', function(m,co) {
        $('#listeners').html(_.size(co));
        var activity = ['li', m.previous('name')+' left the room.'];
        $('#activityLog').prepend(util.buildTree(activity))      
      })
    }
  });
  var Listener = Backbone.Model.extend({
    initialize: function() {
      this.set({lastActivity: Date.now()});
    }
  });
  var CurrentSong = Backbone.Model.extend({
    defaults: {
      djId: null,
      djName: null,
      artist: null,
      title: null,
      bitrate: null,
      upvotes: 0,
      downvotes: 0,
      queues: 0,
      newFans: 0,
      hasVoted: false
    },
    initialize: function() {
      this.bind('change:artist', function(m, a) { $('#artist span').html(a); });
      this.bind('change:title', function(m, a) { $('#title span').html(a); });
      this.bind('change:bitrate', function(m, a) { $('#bitrate span').html(a); });
      this.bind('change:upvotes', function(m, a) { $('#upvotes').html(a); });
      this.bind('change:downvotes', function(m, a) { $('#downvotes').html(a); });
      this.bind('change:queues', function(m, a) { $('#queues').html(a); });
      $('#upvotes, #downvotes, #queues').html(0);
      //tt.room.downvoters = [];
    },
    snag: function(a) {
      var activity = ['li', tt.room.users[a.userid].name+' queued the song.'];
      $('#activityLog').prepend(util.buildTree(activity))  
      var queues = this.get('queues');
      this.set({queues: ++queues})
    }
  });
  
  new TT();
  
  turntable.api = function(c, a) {
    if (c.api == "room.now") {
      return;
    }
    c.msgid = turntable.messageId;
    turntable.messageId += 1;
    c.clientid = turntable.clientId;
    if (turntable.user.id && !c.userid) {
      c.userid = turntable.user.id;
      c.userauth = turntable.user.auth;
    }
    var d = JSON.stringify(c);
    if (turntable.socketVerbose) {
      LOG(util.nowStr() + " Preparing message " + d);
    }
    var b = $.Deferred();
    turntable.whenSocketConnected(function() {
      if (turntable.socketVerbose) {
        LOG(util.nowStr() + " Sending message " + c.msgid + " to " + turntable.socket.host);
      }
      if (turntable.socket.transport.type == "websocket") {
        turntable.socketLog(turntable.socket.transport.sockets[0].id + ":<" + c.msgid);
      }
      turntable.socket.send(d);
      turntable.socketKeepAlive(true);
      turntable.pendingCalls.push({
        msgid: c.msgid,
        handler: a,
        deferred: b,
        time: util.now()
      });
    });
    return b.promise();
  }
})(window)