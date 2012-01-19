var TT = Backbone.Model.extend({
  initialize: function() {
    $this = this;
    
    var loading = [
      'ul.loading',
        ['li', ['img', {src: "https://s3.amazonaws.com/static.turntable.fm/images/room/turntable_logo.png"}]], 
        ['li', 'Contacting Turntable']
    ];
    
    $('body').append(util.buildTree(loading));
    
    turntable.socket.on('message', this.events.received);
        
    this.findObjects();
    
    $(window).resize(function() {
      clearTimeout(window.resizeTimer)
      window.resizeTimer = setTimeout(function(a,b) {
        if (a.height()==$(window).height()&&a.width()==$(window).width()) {
        	b.resize();
        }
      }, 250, $(window), $this)
    })
  },
  findObjects: function() {
    tt=turntable;
    $('.loading li:last').html(function(a,b) { $(this).html(b+'.') });
    if (!tt.room) {
      for (i in tt) {
        if (tt[i]&&tt[i]['selfId']) {
          $('.loading').append(util.buildTree(['li', 'Setting up room..']));
          tt.room=tt[i];
        }
      }
    }
    if (tt['room']&&!tt['room']['manager']) {
      for (i in tt.room) {
        if (tt.room[i]&&tt.room[i]['myuserid']) {
          tt.room.manager = tt.room[i];
        }
      }
    }
    if (!tt['room']||!tt['room']['manager']) { 
      setTimeout(function(a){ 
        a.findObjects() 
      }, 500, this) 
    } 
    else {
      this.setup();
    }
  },
  setup: function() {

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
    
    var currentSong = [
      'div.currentSong', 
        ['div#artist', 'Artist:', ['span', tt.room.currentSong.metadata.artist]],
        ['div#title', 'Title:', ['span', tt.room.currentSong.metadata.song]],
        ['div#bitrate', 'Bitrate:', ['span', (tt.room.currentSong.metadata.bitrate||128)+'kbps']],
    ];
    
    $('.info-container').append(util.buildTree(currentSong));
    
		// Creating Panel Buttons UI Tree
		var panelButtons = [
		  'ul.panelButtons', 
		  ['li.myQueue', {event: {click: function(){ 
		    $(this).siblings().removeClass('active'); 
		    $(this).addClass('active');
		    $('.panel.active').removeClass('active'); 
		    $('.playlist-container').addClass('active'); 
		  } } }, 'My Queue'],
		  ['li.recentSongs', {event: {click: function(){ 
		    $(this).siblings().removeClass('active'); 
		    $(this).addClass('active');
		    $('.panel.active').removeClass('active'); 
		    $('.songlog-container .panel').addClass('active'); 
		  } } }, 'Recent Songs'],
		  ['li.guestList', {event: {click: function(){ 
		    $(this).siblings().removeClass('active'); 
		    $(this).addClass('active');
		    $('.panel.active').removeClass('active'); 
		    $('.guest-list-container').addClass('active'); 
		  } } }, 'Guest List'],
		  ['li.activityLog', {event: {click: function(){ 
		    $(this).siblings().removeClass('active'); 
		    $(this).addClass('active');
		    $('.panel.active').removeClass('active'); 
		    $('.activity-log-container').addClass('active'); 
		  } } }, 'Activity Log'],
		];
		$('.bottom-bar').append(util.buildTree(panelButtons));
		
    // Create Activity Log
    var activityLog = [
      'div.activity-log-container.panel', 
        ['div.title', 'Activity Log'],
        ['ul#activitylog', '']
    ]
    $('#right-panel').append(util.buildTree(activityLog))
		
		// Set Active Panel and Panel Button
		$('.guest-list-container, .panelButtons .guestList').addClass('active');

    // Overwrite current Guest List sorting method
    var getType = function (a) {
    	var b = 6;
    	if (tt.user.fanOf.indexOf(a.userid)>=0) { b = 5; }
    	if (a['verified']) { b = 0; }
    	if (a.acl>1) { b = 1; }
    	if (a.acl==1) { b = 2; }
    	if (tt.room.moderators.indexOf(a.userid)>=0) { b = 3; }
    	if (tt.room.djIds.indexOf(a.userid)>=0) { b = 4; }
    	return b;
    }
    
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

    // Initial resize
    this.resize();
    
    // Unbind .chatHeader mousedown event
    $('.chatHeader').unbind('mousedown');
    
    // 

    $('#outer, .loading').toggle();
  },
  resize: function() {
    var height = $(window).height(),
        width = $(window).width(),
        roomWidth = width - 300,
        roomHeight = height - 60;
    
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
    },
    newsong: function(a) {
      currentSong = a.room.metadata.currentSong.metadata;
      $('#artist span').html(currentSong.artist);
      $('#title span').html(currentSong.song);
      $('#bitrate span').html((currentSong.bitrate||128)+'kbps');
    }
  }
})

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