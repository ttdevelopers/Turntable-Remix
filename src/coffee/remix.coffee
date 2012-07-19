define ['require', 'underscore', 'backbone'], (require, _, Backbone) ->

	window.remixDebug = on
	log = ->
		if remixDebug 
			console.log.apply console, arguments

	Song = Backbone.Model.extend
		initialize: ->
			log @
		
	Room = Backbone.Model.extend
		initialize: (parent) ->			
			log 'New room :D'
			@nodes = {}
			@pendingMsg = []
			
		setup: ->
			log 'Setup room'

			# close guest list menu #
			$('#top-panel, #right-panel').click ->
				do turntable.room.removeGuestListMenu.bind turntable.room 
			# append bottom bar to body #
			$('#right-panel').append util.buildTree Remix.layouts.bottomBar()
			# add pane class to panes #
			$('.guest-list-container').addClass 'active'
			$('.guest-list-container, #buddyListContainer, #room-info-tab, .playlist-container').addClass 'pane'
			
			# append now playing to body #
			$('body').append util.buildTree Remix.layouts.nowPlaying.bind(@)(), @nodes
			$('.info .room').append util.buildTree Remix.layouts.roomButtons.bind(@)(), @nodes
			
			
			# append chat container to body #
			#$('.chat-container').appendTo 'body'
			# append room info to body #
			$('#room-info-tab').appendTo 'body'
			
			# prevent default buddy list toggle # 
			$('.pmGreyTop').off 'click'
			turntable.buddyList.bodyClickHandler = ->
			turntable.buddyList.toggle = ->

		voteButtons: (e) ->
			buttonClass = e.target.className
			@pendingMsg.push
				button: buttonClass
				msgId: turntable.messageId
			if buttonClass is 'upvotes'
				turntable.room.manager.callback 'upvote'
			if buttonClass is 'downvotes'
				turntable.room.manager.callback 'downvote'
			if buttonClass is 'queues'
				turntable.room.manager.callback 'add_song_to', 'queue'
				
	window.Remix = Backbone.Model.extend
		initialize: ->
			@room = new Room @
			do @locateRoom
			ttkeys = Object.keys(turntable)
			turntable.api = turntable[ttkeys[ttkeys.indexOf('getHashedAddr')+1]]
			turntable.socket.on 'message', @messageListener.bind @

		locateRoom: ->
			if not turntable.room
				@locateObj turntable, key, 'selfId', 'room' for key of turntable
			if turntable.room and not turntable.room.manager
				@locateObj turntable.room, key, 'myuserid', 'manager' for key of turntable.room
			if not turntable.room or not turntable.room.manager
				setTimeout @locateRoom.bind(@), 100
			else
				@song.trigger 'roomLoaded'
				
		locateObj: (obj, key, property, type) ->
			if obj[key] and obj[key][property]
				obj[type] = obj[key]
				log 'Found: '+type

		messageListener: (data) ->
			data = JSON.parse(data)
			if data.command
				if data.command of @remoteEvent
					@remoteEvent[data.command].bind(@) data
				else
					log 'TODO: '+ data.command, data
			else if data.room and data.users
				log 'room info: ', data
				@room.setup()
				@remoteEvent.newsong.bind(@) data

			else
				if @room
					pendingMsg = _.find @room.pendingMsg, (msg) ->
						if msg.msgId is data.msgid
							true
					if pendingMsg and data.success
						$('.upvotes, .downvotes').removeClass 'active'
						$('.'+pendingMsg.button).addClass 'active'
		remoteEvent:
			registered: (data) ->
				log 'registered', data
			newsong: (data) ->
				log 'new song', data 
				metadata = data.room.metadata
				if metadata.current_song
					@song = new Song @room
					@song.set
						artist: metadata.current_song.metadata.artist
						title: metadata.current_song.metadata.song
						album: metadata.current_song.metadata.album
						bitrate: metadata.current_song.metadata.bitrate || 128
			update_votes: (data) ->
				@song.set
					upvotes: data.room.metadata.upvotes
					downvotes: data.room.metadata.downvotes
	Remix.layouts =
		bottomBar: ->
			buttonClick = (pane)->
				event: 
					click: ->
						if pane is '#buddyListContainer'
							$('#privateChatIcon').addClass 'open'
						else
							$('#privateChatIcon').removeClass 'open' 
						$('#bottom-bar .buttons div').removeClass 'active'
						$('.pane').removeClass 'active'
						$(@).addClass 'active'
						$(pane).addClass 'active'
				
			['div#bottom-bar', {}, 
				['div.buttons', {}, 
					['div.playlist', buttonClick('.playlist-container'), ''],
					['div.listeners', buttonClick('.guest-list-container'), ''],
					['div.buddies', buttonClick('#buddyListContainer'), ''],
					['div.roomInfo', buttonClick('#room-info-tab'), ''],
					['div.activity', buttonClick('.playlist-container'), ''],
					['div.settings', buttonClick('.playlist-container'), ''],
				]
			]
			
		activityPanel: ['div.activity-container.panel##activityPanel', {},
			['div.black-right-header', {}, 
				['div.header-text', {}, 'Activity Log']
			],
			['div.content', {},
				['ul#activity##activities', {}, '']
			]
		],
		settingsPanel: ->
			menuItems = ['div.content', {}]
			$('#menuh > div + div').each ->
			  item = ['div.btn', { event: { click: $(this).data('events').click[0].handler } }, $(this).text()]
			  menuItems.push item

			['div.settings-container.panel#settingsPanel', {},
				['div.black-right-header', {}, 
					['div.header-text', {}, 'Settings']
				],
				menuItems
			]
		roomButtons: -> 
			['span', {}, 
				['div.list', {event: { click: turntable.room.listRoomsShow }, title: 'List Rooms' }, ''],
				['div.random', {event: { click: turntable.randomRoom }, title: 'Random Room' }, '']
			]
		nowPlaying: ->
			['div#nowPlaying##nowPlaying', {}, 
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
				],		
				['div.stats', {}, 
					['div.upvotes##upvotes', {event: { click: @voteButtons.bind @ }}, '0'],
					['div.downvotes##downvotes', {event: { click: @voteButtons.bind @ }}, '0'],
					['div.queues##queues', {event: { click: @voteButtons.bind @ }}, '0']
				],			
			]
			
	Remix