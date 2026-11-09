// Minimal Spicetify API stand-in so theme.js can run in a plain browser (see dev/smoke.mjs).
(() => {
  const listeners = [], playerListeners = {};
  const art = (hue, label) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue+60)%360},70%,30%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><text x="20" y="270" font-family="Helvetica" font-size="36" fill="white">${label}</text></svg>`);
  const names = ['Blonde','Currents','In Rainbows','Random Access Memories','Melodrama','Discovery','Norman F***ing Rockwell','Ctrl','Igor','Awaken, My Love!','Channel Orange','Kid A','Sour','folklore','After Hours','Ants From Up There','Punisher','Titanic Rising','Since I Left You','Heaven or Las Vegas'];
  const library = [];
  names.forEach((n, i) => library.push({ uri: 'spotify:album:' + i, type: 'album', name: n, images: [{ url: art(i * 37, n.slice(0, 2)) }], artists: [{ type: 'artist', name: 'Sanatçı ' + i, uri: 'spotify:artist:a' + i }] }));
  ['Frank Ocean','Tame Impala','Radiohead','Daft Punk','Lorde','Phoebe Bridgers'].forEach((n, i) => library.push({ uri: 'spotify:artist:' + i, type: 'artist', name: n, images: [{ url: art(200 + i * 20, n[0]) }] }));
  // Owners as Spotify's library items carry them: yours (isOwnedBySelf), Spotify's (spotify:user:spotify) or someone else's.
  const owners = Object.fromEntries([['emir', true], ['spotify', false], ['ece', false]].map(([id, own]) => [id, { isOwnedBySelf: own, owner: { displayName: id === 'spotify' ? 'Spotify' : id, uri: 'spotify:user:' + id } }]));
  // Playlists in the order Spotify's Recents sort returns them: pinned first, then by last played.
  library.push({ uri: 'spotify:folder:ruh', type: 'folder', name: 'Ruh Hali', pinned: true, images: [] });
  ['Sabah Kahvesi','Koşu','Odak','Yol Şarkıları','Gece Sürüşü','Ders Çalışma','Akustik Akşamlar','Yağmurlu Günler','90\'lar Türkçe Pop','Haftalık Keşif'].forEach((n, i) => library.push({ uri: 'spotify:playlist:' + i, type: 'playlist', name: n, pinned: i === 0,
    images: i === 6 ? [] : [{ url: art(i * 90, '♪'), width: 640 }, { url: art(i * 90 + 20, '♪'), width: 60 }], ...owners[i === 9 ? 'spotify' : i === 8 ? 'ece' : 'emir'], isMixed: i === 3,
    lastPlayedAt: 1e12 - i, addedAt: new Date(Date.UTC(2026, 0, 1 + (i * 7) % 10)).toISOString() }));
  library.push({ uri: 'spotify:collection:tracks', type: 'liked-songs', name: 'Beğenilen Şarkılar', pinned: true, images: [], isOwnedBySelf: true });
  const folders = { 'spotify:folder:ruh': ['Neşeli', 'Hüzünlü'].map((n, i) => ({ uri: 'spotify:playlist:f' + i, type: 'playlist', name: n, images: [{ url: art(300 + i * 30, '♪') }], ...owners[i ? 'spotify' : 'emir'], lastPlayedAt: 5e11 - i })) };
  window.__mockLibrary = library;
  // Spotify's library and rootlist emit 'update' (and the library 'update_pin') through an emitter behind getEvents().
  const emitter = { listeners: {}, addListener(name, fn) { (this.listeners[name] ||= []).push(fn); }, removeListener() {}, emit(name = 'update') { (this.listeners[name] || []).forEach(fn => fn({})); } };
  let created = 0;
  const createItem = type => async (name, location) => {
    const uri = `spotify:${type}:new${++created}`;
    (window.__created ||= []).push([type, name, location]);
    library.splice(library.findIndex(i => !i.pinned && ['playlist', 'folder'].includes(i.type)), 0, { uri, type, name, images: [], ...owners.emir, lastPlayedAt: 2e12 });
    emitter.emit(); return uri;
  };
  const state = { liked: false, playing: true, shuffle: false, repeat: 0, volume: .6, progress: 83000, duration: 245000 };
  window.__menus = [];
  window.Spicetify = {
    showNotification: m => { (window.__notes ||= []).push(m); },
    // notistack's provider; the theme closes a snackbar it retold by the id on its React fiber.
    Snackbar: { closeSnackbar: id => { (window.__closedSnacks ||= []).push(id); }, handleExitedSnack: () => {} },
    Menu: {
      // Profile-menu entries: register()ed items land in __menuItems. ?menu=submenu mocks a Spicetify whose items cannot
      // register, so the theme falls back to its mcloud submenu.
      Item: class { constructor(name, checked, onClick) { Object.assign(this, { name, checked, onClick }); } setState(v) { this.checked = v; } register() { (window.__menuItems ||= []).push(this); } deregister() { window.__menuItems = (window.__menuItems || []).filter(i => i !== this); } },
      SubMenu: class { constructor(name, items) { Object.assign(this, { name, items }); } register() { window.__menus.push(this); } deregister() {} },
    },
    // Spicetify.Queue as Spicetify keeps it: the next tracks (the Now Playing pane's Playing Next, #182), a delimiter among them.
    Queue: { nextTracks: [['Pink + White', 'Frank Ocean', '#d88a9a'], ['Ivy', 'Frank Ocean', '#6a8f4e'], ['Self Control', 'Frank Ocean', '#4a6fa5'], ['spotify:delimiter'], ['Solo', 'Frank Ocean', '#c9a227'], ['Godspeed', 'Frank Ocean', '#7d5ba6']].map(([title, artist, color], i) => ({ contextTrack: title.startsWith('spotify:') ? { uri: title, uid: 'd' } : { uri: 'spotify:track:q' + i, uid: 'u' + i, metadata: { title, artist_name: artist, image_url: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`) } }, provider: i < 2 ? 'queue' : 'context' })) },
    Player: {
      origin: { _state: {} },
      data: { context: { uri: 'spotify:album:0' }, item: { uri: 'spotify:track:1', name: 'Nights', artists: [{ name: 'Frank Ocean', uri: 'spotify:artist:0' }], album: { uri: 'spotify:album:0', name: 'Blonde', images: [{ url: art(30, 'Bl'), label: 'standard' }] }, images: [{ url: art(30, 'Bl'), label: 'small' }], metadata: { title: 'Nights', artist_name: 'Frank Ocean', album_uri: 'spotify:album:0', has_lyrics: 'true', 'canvas.url': 'https://canvaz.scdn.co/upload/mock/video/nights.cnvs.mp4', 'canvas.type': 'VIDEO_LOOPING_RANDOM' } } },
      isPlaying: () => state.playing, togglePlay: () => { state.playing = !state.playing; },
      getShuffle: () => state.shuffle, toggleShuffle: () => { state.shuffle = !state.shuffle; },
      getRepeat: () => state.repeat, toggleRepeat: () => { state.repeat = (state.repeat + 1) % 3; },
      getVolume: () => state.volume, setVolume: v => { state.volume = v; },
      getProgress: () => state.progress, getDuration: () => state.duration,
      getProgressPercent: () => state.progress / state.duration, seek: ms => { state.progress = ms; },
      getHeart: () => state.liked, toggleHeart: () => { state.liked = !state.liked; },
      back() {}, next() {},
      playUri: async uri => { window.__playedUri = uri; },
      addEventListener: (n, f) => (playerListeners[n] ||= []).push(f),
    },
    addToQueue: async items => { (window.__queueAdds ||= []).push(...items); },
    Platform: {
      History: {
        location: { pathname: '/', search: '' },
        push(p) { this.location = typeof p === 'string' ? { pathname: p, search: '' } : { pathname: p.pathname, search: p.search || '' }; listeners.forEach(f => f(this.location)); },
        listen: f => listeners.push(f),
      },
      UserAPI: { getUser: async () => ({ username: 'emir', displayName: 'Emir Bilici', images: [] }) },
      PlayerAPI: {
        addToQueue: async items => { (window.__queueAdds ||= []).push(...items); },
        play: async () => {},
        skipTo: async item => { (window.__skips ||= []).push(item); },
      },
      PlaylistAPI: {
        add: async (playlistUri, uris, options) => { (window.__playlistAdds ||= []).push({ playlistUri, uris, options }); },
      },
      LibraryAPI: {
        // filters ['2'] = playlists and folders; sortOrder '6' = Recents, the order the mock list is already in.
        getContents: async ({ offset, filters = [], folderUri }) => {
          let items = folderUri ? folders[folderUri] || [] : library;
          if (filters.includes('2')) items = items.filter(i => ['playlist', 'folder', 'liked-songs'].includes(i.type));
          // By you (102), By Spotify (103) and Mixed (107) keep a folder only if a playlist in it passes, as Spotify's do
          // (measured with a test folder in the client, 2026-11-04); its playlists stay inside it.
          const own = i => i.isOwnedBySelf, spotify = i => i.owner?.uri === 'spotify:user:spotify', mixed = i => i.isMixed;
          for (const [id, test] of [['102', own], ['103', spotify], ['107', mixed]]) if (filters.includes(id)) items = items.filter(i => i.type === 'folder' ? (folders[i.uri] || []).some(test) : test(i));
          (window.__libraryFilters ||= []).push(filters.join());
          return { items: offset ? [] : items, totalLength: items.length };
        },
        getEvents: () => ({ _emitter: emitter }),
      },
      RootlistAPI: { createPlaylist: createItem('playlist'), createFolder: createItem('folder'), getEvents: () => ({ _emitter: emitter }),
        // Rootlist order with folders flattened; a Spotify-made playlist such as Haftalık Keşif can't be added to.
        getContents: async ({ flatten } = {}) => ({ items: library.filter(i => ['playlist', 'folder'].includes(i.type)).flatMap(i => [i, ...(flatten && folders[i.uri] || [])])
          .map(i => ({ ...i, canAdd: i.type === 'playlist' && i.name !== 'Haftalık Keşif' })) }) },
    },
  };
  window.__mockState = state;
  window.__firePlayer = name => (playerListeners[name] || []).forEach(f => f({}));
  window.__libraryUpdate = () => emitter.emit();
  // Shape follows Spotify's queryArtistOverview response (artistUnion).
  const cover = (n, i) => ({ sources: [{ url: art(i * 47, n.slice(0, 2)), width: 300, height: 300 }] });
  const release = (n, i, type, year) => ({ releases: { items: [{ uri: 'spotify:album:r' + i, name: n, type, date: { year }, coverArt: cover(n, i) }] } });
  // getAlbum (albumUnion): album 0 is Frank Ocean's alone; album 1 is two artists' (both count as the album's own).
  const solid = hex => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${hex}"/></svg>`);
  const albumArtist = (id, name) => ({ uri: 'spotify:artist:' + id, profile: { name } });
  window.__mockAlbums = {
    // Three tracks, 62 minutes in all: the list line under the tracks reads "3 şarkı, 1 saat, 2 dakika" (#97).
    0: { __typename: 'Album', name: 'Blonde', uri: 'spotify:album:0', artists: { items: [albumArtist('frank', 'Frank Ocean')] }, coverArt: { sources: [{ url: solid('#2a7fd4'), width: 64, height: 64 }] },
      tracksV2: { totalCount: 3, items: [1200000, 1500000, 1025000].map(ms => ({ track: { duration: { totalMilliseconds: ms } } })) } },
    1: { __typename: 'Album', name: 'Watch the Throne', uri: 'spotify:album:1', artists: { items: [albumArtist('jay', 'JAY-Z'), albumArtist('kanye', 'Kanye West')] }, coverArt: { sources: [{ url: solid('#c8a040'), width: 64, height: 64 }] } },
  };
  window.__mockArtist = {
    uri: 'spotify:artist:mock', saved: false,
    profile: { name: 'Sena Şener', biography: { text: 'Sena Şener, <b>İstanbul</b> doğumlu şarkıcı ve söz yazarı.' } },
    stats: { monthlyListeners: 1234567, followers: 456789, topCities: { items: [{ city: 'İstanbul', country: 'TR', numberOfListeners: 210000 }, { city: 'Ankara', country: 'TR', numberOfListeners: 90000 }, { city: 'Berlin', country: 'DE', numberOfListeners: 40000 }] } },
    // Spotify moved the wide header out of visuals (2026): sources carry maxWidth/maxHeight, largest first.
    headerImage: { data: { sources: [{ url: art(355, 'SŞ'), maxWidth: 2660, maxHeight: 1140 }, { url: art(350, 'S'), maxWidth: 1495, maxHeight: 641 }] } },
    visuals: {
      avatarImage: { sources: [{ url: art(355, 'SŞ'), width: 640 }], extractedColors: { colorRaw: { hex: '#C8102E' } } },
      gallery: { items: [{ sources: [{ url: art(20, 'Gal'), width: 640, height: 640 }] }] },
    },
    goods: { events: { concerts: { items: [
      { title: 'Edirne', date: { isoString: '2026-11-13T22:00:00' }, venue: { name: 'Black Corner Pub', location: { name: 'Edirne, Türkiye' } } },
      { title: 'Ankara', date: { isoString: '2026-11-21T22:00:00' }, venue: { name: 'Milyon Event Hall', location: { name: 'Ankara, Türkiye' } } },
    ] } } },
    discography: {
      latest: { uri: 'spotify:album:latest', name: 'Sev Diyeydi', type: 'SINGLE', date: { year: 2026, month: 10, day: 23 }, coverArt: cover('Sev Diyeydi', 1), tracks: { totalCount: 1 } },
      topTracks: { items: ['Sev Diyeydi', 'Sevmemeliyiz', 'Alışılır Mı Aşka', 'Affettim Herkesi', 'Fly Above', 'Affetmem', 'Dönmek', 'Kaybettiklerimi Geri Ver', 'Feel'].map((n, i) => ({ track: { uri: 'spotify:track:t' + i, name: n, albumOfTrack: { uri: 'spotify:album:a' + i, name: n + ' - Single', coverArt: cover(n, i + 3) }, artists: { items: [{ profile: { name: 'Sena Şener' } }] } } })) },
      albums: { items: [release('İnsan Gelir İnsan Geçer (Deluxe)', 20, 'ALBUM', 2018)] },
      singles: { items: ['Sev Diyeydi', 'Alışılır Mı Aşka', 'Aşkından Ölmemeli', 'Gurbet', 'Defolup Gidelim', 'Affettim Herkesi', 'Kaybettiklerimi Geri Ver'].map((n, i) => release(n, 30 + i, 'SINGLE', 2026 - i)) },
    },
    relatedContent: {
      appearsOn: { items: ['Feel (feat. Sena Şener)', 'Waiting on the Shore', 'Slavery'].map((n, i) => ({ releases: { items: [{ uri: 'spotify:album:ap' + i, name: n, artists: { items: [{ profile: { name: 'Mahmut Orhan' } }] }, coverArt: cover(n, 50 + i) }] } })) },
      relatedArtists: { items: ['Canozan', 'Dolu Kadehi Ters Tut', 'Sufle', 'Pinhani', 'Cem Adrian'].map((n, i) => ({ uri: 'spotify:artist:s' + i, profile: { name: n }, visuals: { avatarImage: cover(n, 70 + i) } })) },
    },
  };
  // searchDesktop (searchV2): Top Results wrap each item twice (itemsV2[].item.data), the song list once (items[].item.data),
  // every other kind once (items[].data).
  const person = (n, i) => ({ __typename: 'Artist', uri: 'spotify:artist:q' + i, profile: { name: n }, visuals: { avatarImage: cover(n, 90 + i) } });
  const searchTrack = (n, i) => ({ __typename: 'Track', uri: 'spotify:track:q' + i, name: n, contentRating: { label: i % 3 ? 'NONE' : 'EXPLICIT' }, duration: { totalMilliseconds: 180000 + i * 7000 },
    albumOfTrack: { uri: 'spotify:album:qa' + i, name: n, coverArt: cover(n, 10 + i) }, artists: { items: [{ uri: 'spotify:artist:q0', profile: { name: 'Sena Şener' } }] } });
  const searchAlbum = (n, i) => ({ __typename: 'Album', uri: 'spotify:album:qb' + i, name: n, type: i ? 'ALBUM' : 'SINGLE', date: { year: 2026 - i }, coverArt: cover(n, 30 + i), artists: { items: [{ uri: 'spotify:artist:q0', profile: { name: 'Sena Şener' } }] } });
  const searchList = (n, i) => ({ __typename: 'Playlist', uri: 'spotify:playlist:qp' + i, name: n, images: { items: [cover(n, 60 + i)] }, ownerV2: { data: { __typename: 'User', name: 'Spotify', uri: 'spotify:user:spotify' } } });
  const songs = ['Sev Diyeydi', 'Sevmemeliyiz', 'Alışılır Mı Aşka', 'Affettim Herkesi', 'Fly Above', 'Affetmem', 'Dönmek', 'Kaybettiklerimi Geri Ver', 'Feel', 'Gurbet'].map(searchTrack);
  window.__mockSearch = {
    topResultsV2: { itemsV2: [person('Sena Şener', 0), songs[0], searchAlbum('İnsan Gelir İnsan Geçer', 1), songs[1], searchList('This Is Sena Şener', 0), songs[2], songs[3], songs[4]].map(data => ({ item: { data } })) },
    artists: { items: ['Sena Şener', 'Sena', 'Senanur', 'Sena Kaya', 'Sena Sener Trio', 'DJ Sena', 'Sena Band'].map((n, i) => ({ data: person(n, i) })) },
    albumsV2: { items: ['Sev Diyeydi', 'İnsan Gelir İnsan Geçer', 'Deluxe', 'Akustik', 'Canlı', 'Remixler', 'Yeni'].map((n, i) => ({ data: searchAlbum(n, i) })) },
    tracksV2: { items: songs.map(data => ({ item: { data } })) },
    playlists: { items: ['This Is Sena Şener', 'Türkçe Indie', 'Akustik Akşamlar', 'Yol'].map((n, i) => ({ data: searchList(n, i) })) },
    podcasts: { items: [] }, episodes: { items: [] }, users: { items: [{ data: { __typename: 'User', uri: 'spotify:user:sena', displayName: 'Sena', avatar: cover('Sena', 99) } }] }, genres: { items: [] },
  };
  // A kind's page (searchTracks, searchAlbums, …: Spotify's tabs) answers 30 at a time from offset, with pagingInfo's
  // nextOffset, null on the last page; 45 of each.
  const searchKindMock = { searchTracks: ['tracksV2', i => ({ item: { data: searchTrack('Şarkı ' + (i + 1), 20 + i) } })], searchArtists: ['artists', i => ({ data: person('Sanatçı ' + (i + 1), 20 + i) })],
    searchAlbums: ['albumsV2', i => ({ data: searchAlbum('Albüm ' + (i + 1), 20 + i) })], searchPlaylists: ['playlists', i => ({ data: searchList('Liste ' + (i + 1), 20 + i) })],
    searchUsers: ['users', i => ({ data: { __typename: 'User', uri: 'spotify:user:u' + i, displayName: 'Profil ' + (i + 1), avatar: cover('P', 20 + i) } })] };
  const searchKindPage = (name, { offset, limit }) => {
    const [field, item] = searchKindMock[name], end = Math.min(45, offset + limit);
    return { data: { searchV2: { [field]: { totalCount: 45, pagingInfo: { nextOffset: end < 45 ? end : null }, items: Array.from({ length: end - offset }, (_, k) => item(offset + k)) } } } };
  };
  if (new URLSearchParams(location.search).get('menu') === 'submenu') delete Spicetify.Menu.Item.prototype.register;
  Spicetify.Locale = { getLocale: () => new URLSearchParams(location.search).get('locale') || 'tr', get: key => ({ 'web-player.aligned-curation.tooltips.remove-from-liked-songs': 'Remove from Liked Songs', 'web-player.aligned-curation.contextmenu.new-playlist': 'New playlist', save_to_your_library: 'Save to Your Library', remove_from_your_library: 'Remove from Your Library' })[key] ?? key };
  Spicetify.GraphQL = {
    Definitions: { queryArtistOverview: { name: 'queryArtistOverview' }, searchDesktop: { name: 'searchDesktop' }, ...Object.fromEntries(['searchTracks', 'searchArtists', 'searchAlbums', 'searchPlaylists', 'searchUsers'].map(name => [name, { name }])), getAlbum: { name: 'getAlbum' }, fetchExtractedColorAndImageForArtistEntity: { name: 'fetchExtractedColorAndImageForArtistEntity' }, fetchExtractedColorAndImageForTrackEntity: { name: 'fetchExtractedColorAndImageForTrackEntity' } },
    // getAlbum answers in Spotify's albumUnion shape (the fields the theme reads), from window.__mockAlbums by id. The mix
    // covers' photo lookups (an artist's avatar, a track's album art) answer as Spotify's small colour-and-image queries.
    Request: async (def, vars) => def.name === 'getAlbum'
      ? (window.__albumRequests ||= []).push(vars) && { data: { albumUnion: (window.__mockAlbums || {})[vars.uri.split(':').pop()] || { __typename: 'NotFound' } } }
      : def.name === 'fetchExtractedColorAndImageForArtistEntity' ? (window.__mixRequests ||= []).push(vars.uri) && { data: { artistUnion: { visuals: { avatarImage: cover('Mix', 9) } } } }
      : searchKindMock[def.name] ? (window.__searchRequests ||= []).push({ kind: def.name, ...vars }) && searchKindPage(def.name, vars)
      : def.name === 'searchDesktop' ? (window.__searchRequests ||= []).push(vars) && (window.__mockSearchFail ? { errors: [{ message: 'mock' }] } : { data: { searchV2: window.__mockSearch } })
      : def.name === 'fetchExtractedColorAndImageForTrackEntity' ? (window.__mixRequests ||= []).push(vars.uri) && { data: { trackUnion: { albumOfTrack: { coverArt: cover('Radio', 5) } } } }
      : (window.__artistRequests ||= []).push(vars) && { data: { artistUnion: window.__mockArtist } },
  };
  window.__graphqlRequest = Spicetify.GraphQL.Request; // tests that break the API put it back with this
  Spicetify.Platform.GraphQLLoader = Spicetify.GraphQL.Request; // what Spicetify's GraphQL.Request getter returns
  Object.assign(Spicetify.Platform.LibraryAPI, {
    add: async ({ uris }) => { (window.__libraryAdds ||= []).push(...uris); },
    remove: async ({ uris }) => { (window.__libraryRemoves ||= []).push(...uris); },
    contains: async (...uris) => uris.map(() => true),
    // As Spotify's: the item is pinned at the line and only update_pin is emitted.
    pin: async (uri, where) => { (window.__pins ||= []).push([uri, where]);
      const at = library.findIndex(i => i.uri === uri), [item] = at < 0 ? [] : library.splice(at, 1); if (!item) return;
      const target = library.findIndex(i => i.uri === (where?.before || where?.after)?.uri); item.pinned = true;
      library.splice(target < 0 ? 0 : target + (where?.after ? 1 : 0), 0, item); emitter.emit('update_pin'); },
    unpin: async uri => { (window.__unpins ||= []).push(uri); },
    getIsPinned: async (...uris) => uris.map(u => !!library.find(i => i.uri === u)?.pinned),
  });
  // Your own playlists can be deleted and shown on your profile (the first one is); a playlist in window.__followed is only saved.
  // window.__mockPlaylistMeta adds fields by uri (length, cover: totalLength, duration, images).
  Object.assign(Spicetify.Platform.PlaylistAPI, {
    getMetadata: async uri => { await new Promise(r => setTimeout(r, window.__apiDelay || 0)); const own = !(window.__followed || []).includes(uri); return { uri, name: document.querySelector(`[data-uri="${uri}"]`)?.title || 'Liste', description: '', isOwnedBySelf: own, isSaved: true, isPublished: /:0$/.test(uri), canRemove: own, canEditMetadata: own, permissions: { canAdministratePermissions: own, isPrivate: false }, ...(window.__mockPlaylistMeta || {})[uri] }; },
    updateDetails: async (uri, details) => { (window.__details ||= []).push({ uri, ...details }); },
    remove: async (uri, items) => { (window.__playlistRemoves ||= []).push({ uri, items }); },
  });
  Spicetify.Platform.PlaylistPermissionsAPI = { setBasePermission: async (uri, p) => { (window.__permissions ||= []).push([uri, p]); } };
  Spicetify.Platform.CollectionPlatformAPI = { contains: async (set, uris) => uris.map(u => (window.__banned || []).includes(u)), add: async (set, uris) => { (window.__banned ||= []).push(...uris); }, remove: async (set, uris) => { window.__banned = (window.__banned || []).filter(u => !uris.includes(u)); } };
  Object.assign(Spicetify.Platform.RootlistAPI, {
    remove: async items => { (window.__rootlistRemoves ||= []).push(...items.map(i => i.uri)); },
    setPublishedState: async (uri, on) => { (window.__published ||= []).push([uri, on]); },
    contains: async uris => uris.map(u => library.some(i => i.uri === u)),
    move: async (items, where) => { (window.__rootlistMoves ||= []).push([items.map(i => i.uri).join(), where]); },
    moveFolder: async (item, where) => { (window.__rootlistMoves ||= []).push([item.uri, where]); },
  });
  // Spotify's Redux store, found by the theme in the React tree under #main (it opens Spotify's credits dialog), and the
  // radio lookup Spotify's "Go to artist radio" makes.
  document.getElementById('main').__reactContainer$mock = { child: { memoizedProps: { store: { getState: () => ({ ui: { trackCreditsModal: { isOpen: false } } }), dispatch: action => { (window.__dispatched ||= []).push(action); } } } } };
  // Spotify's lyrics (color-lyrics, line synced) for the playing track; other requests are the radio lookup.
  const lyricLines = ['Round your city, round the clock', 'Everybody needs you', 'No, you can\'t make everybody equal', 'Although you got beautiful people', '♪', 'Every night fucks every day up', 'Every day patches the night up'];
  Spicetify.CosmosAsync = { get: async url => { (window.__cosmos ||= []).push(url);
    if (url.includes('/color-lyrics/')) { if (!url.includes('/track/1?')) throw new Error('404');
      return { lyrics: { syncType: 'LINE_SYNCED', providerDisplayName: 'Musixmatch', lines: lyricLines.map((words, i) => ({ startTimeMs: String(60000 + i * 10000), words })) }, colors: {} }; }
    return { mediaItems: [{ uri: 'spotify:playlist:radio' }] }; } };
  Spicetify.Platform.History.goBack = function () { this.push('/'); };
  // ?os=windows: Spotify's Windows client. Its native shell draws the app menu's "…" (top left) and minimise/maximise/close
  // (top right) over the page, here a stand-in strip (#mock-caption) that follows the calls. The desktop services as
  // Spicetify resolves them from Spotify's registry: one DesktopUpdateUi client (methods on its prototype) behind
  // ControlMessageAPI and NativeAPI, and DesktopWindowState behind FocusMainWindowAPI. window.__win records it all.
  if (new URLSearchParams(location.search).get('os') === 'windows') {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Spotify/1.3.8.620 Safari/537.36' });
    document.documentElement.classList.add('spotify__os--is-windows', 'spotify__container--is-desktop');
    const win = window.__win = { calls: [], buttons: true, height: 64, state: 1, subscribers: [] };
    const strip = document.createElement('div'); strip.id = 'mock-caption';
    strip.innerHTML = '<style>#mock-caption{position:fixed;inset:0 0 auto;z-index:2147483647;pointer-events:none;font:16px "Segoe UI",sans-serif;color:#fff}#mock-caption>div{position:absolute;top:0;display:flex;align-items:center;height:var(--h)}#mock-caption .m{left:12px;width:46px;justify-content:center}#mock-caption .c{right:0}#mock-caption .c span{width:46px;text-align:center}</style><div class="m">…</div><div class="c"><span>─</span><span>☐</span><span>✕</span></div>';
    const draw = () => { strip.style.display = win.buttons && win.height > 1 ? '' : 'none'; strip.style.setProperty('--h', win.height + 'px'); };
    document.addEventListener('DOMContentLoaded', () => { document.body.append(strip); draw(); });
    class DesktopUpdateUi {
      updateTitlebarHeight(req) { win.calls.push(['height', req.height]); win.height = req.height; draw(); return Promise.resolve({}); }
      setButtonsVisibility(req) { win.calls.push(['buttons', req.showButtons]); win.buttons = req.showButtons; draw(); return Promise.resolve({}); }
      updateMenuState() { return Promise.resolve({}); }
    }
    const ui = new DesktopUpdateUi();
    const windowState = {
      getWindowState: async () => ({ state: win.state }),
      setWindowState: async ({ state }) => { win.calls.push(['state', state]); if (state !== 3) win.state = state; win.subscribers.forEach(f => f({ state })); return {}; },
      closeWindow: async () => { win.calls.push(['close']); return {}; },
      focusWindow: async () => ({}),
      subscribeWindowState: (req, f) => { win.subscribers.push(f); return { cancel() {} }; },
    };
    Object.assign(Spicetify.Platform, {
      ControlMessageAPI: { _updateUiClient: ui, setTitlebarHeight: h => ui.updateTitlebarHeight({ height: h }) },
      NativeAPI: { _updateUiClient: ui, setWindowButtonsVisibility: v => ui.setButtonsVisibility({ showButtons: v }) },
      FocusMainWindowAPI: { _windowStateClient: windowState },
    });
  }
  // Home's "New release from …" shelf (HomeV2SpotlightShelf, #199) as Spotify 1.3.6 renders it: a section header with the
  // artist, then Encore's horizontal promotion card, a Box link whose title carries the fixed id
  // promotion-default-native-title. Its buttons sit in Encore tooltip triggers; a hovered one adds its tooltip
  // (role="tooltip", data-encore-id="tooltip") inline after the button, not in a [data-tippy-root].
  // mockSpotlight(parent, {tooltip:true}) appends it; the CSS-module names are copied from Spotify's.
  const tip = text => `<div class="overlay-trigger__overlay overlay-trigger__overlay--bottom" style="pointer-events:none;position:absolute;display:flex;justify-content:center;top:100%;left:50%;min-inline-size:296px;transform:translate(-50%,12px);z-index:1000"><div class="e-101040-text encore-text-body-small legacy-overlay legacy-tooltip legacy-tooltip--visible encore-base-set _tooltip-animation_igq95_1" role="tooltip" data-encore-id="tooltip" style="display:inline-block;max-inline-size:240px;padding:4px 8px;border-radius:8px;background:#2a2a2a;color:#fff;font-size:14px"><span data-encore-id="text">${text}</span></div></div>`;
  const trigger = (button, text, open) => `<span class="overlay-trigger overlay-trigger--has-overlay" data-encore-id="tooltipTrigger" style="position:relative;display:inline-flex"><span class="tooltip-trigger__container">${button}</span>${open ? tip(text) : ''}</span>`;
  const icon = d => `<svg data-encore-id="icon" role="img" aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="${d}"/></svg>`;
  window.mockSpotlight = (parent = document.querySelector('.mock-page'), { tooltip = false, saved = false } = {}) => {
    const play = 'Play Someone New', save = saved ? 'Remove from Your Library' : 'Save to Your Library';
    parent.insertAdjacentHTML('beforeend', `<section class="T05Zn40DfdmfgisTAPRD jt3s9X9vj1kerCU2gNlo" data-shelf-collapsable="true" data-testid="mock-spotlight" style="display:flex;flex-direction:column;max-width:600px;--shelf-fixed-height:224px">`
      + `<div data-encore-id="listRow" class="mock-spot-head" style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div class="e-101040-legacy-list-row__header-side"><img alt="" src="${art(320, 'SŞ')}" style="width:48px;height:48px;border-radius:50%"></div><div><span data-encore-id="listRowSubtitle" style="font-size:14px;color:#b3b3b3">New release from</span><h2 data-encore-id="listRowTitle" style="margin:0;font-size:24px"><a href="/artist/mock">Sena Şener</a></h2></div></div>`
      + `<a data-encore-id="box" class="legacy-box legacy-box--naked legacy-box--as-link legacy-box--interactive legacy-box--padding-custom legacy-box--hover-custom legacy-box--border-custom _card-container_lx1hg_1 Ghk7CjjXzSetIVoEVFOA" href="/album/r0" tabindex="0" style="--box-border-radius:var(--encore-corner-radius-larger-2);--box-padding:12px;display:block;height:var(--shelf-fixed-height);padding:12px;margin-inline:-12px;border-radius:8px;color:#fff;text-decoration:none">`
      + `<div class="_layout-container_lx1hg_34" style="display:grid;grid-template:'image .' 'image title-area' minmax(0,max-content) 'image body-area' minmax(0,min-content) 'image footer-area' minmax(0,max-content) 'image .'/max-content 1fr;column-gap:16px;align-items:center;height:100%">`
      + `<div class="_image-container_1ysjf_7" style="grid-area:image;height:100%;border-radius:8px;overflow:hidden;position:relative"><img class="_image_1ysjf_1" src="${art(20, 'SN')}" aria-labelledby="promotion-default-native-title" style="width:100%;height:100%;object-fit:cover"></div>`
      + `<div class="_title-area_lx1hg_57" style="grid-area:title-area;display:flex;flex-direction:column;gap:2px;margin-bottom:2px"><span class="e-101040-text encore-text-body-small _truncated-text_lx1hg_81 _truncated-text-single-line_lx1hg_92" data-encore-id="text" style="color:#b3b3b3;font-size:14px">Single • Sena Şener</span><span class="e-101040-text encore-text-title-small _truncated-text_lx1hg_81" data-encore-id="text" id="promotion-default-native-title" style="font-size:24px;font-weight:700">Someone New (from the Motion Picture Soundtrack)</span></div>`
      + `<div class="_body-area_lx1hg_65" style="grid-area:body-area"></div>`
      + `<div class="_footer-area_lx1hg_73" style="grid-area:footer-area;display:flex;gap:8px">`
      + trigger(`<button data-encore-id="buttonPrimary" class="e-101040-button-primary" aria-label="${play}" style="border:0;padding:0;background:none"><span class="e-101040-button-primary__inner encore-inverted-light-set e-101040-button-icon-only--small" style="display:flex;align-items:center;justify-content:center;inline-size:32px;block-size:32px;border-radius:50%;background:#fff;color:#000">${icon('m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z')}</span></button>`, play, tooltip === 'play')
      + `<div class="_tertiary-footer-icons_lx1hg_96" style="display:flex;align-items:center">`
      + trigger(`<button data-encore-id="buttonTertiary" class="e-101040-button-tertiary e-101040-button-tertiary--icon-only" aria-label="${save}"${saved ? ' aria-checked="true"' : ''} style="border:0;background:none;color:${saved ? '#1ed760' : '#b3b3b3'};padding:8px"><span aria-hidden="true" class="e-101040-button__icon-wrapper">${icon('M11.999 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11z M17.999 12a1 1 0 0 1-1 1h-4v4a1 1 0 1 1-2 0v-4h-4a1 1 0 1 1 0-2h4V7a1 1 0 1 1 2 0v4h4a1 1 0 0 1 1 1z')}</span></button>`, save, tooltip === true || tooltip === 'save')
      + `<div class="_tertiary-footer-visibility-buttons_lx1hg_28" style="display:flex;align-items:center">`
      + trigger(`<button data-encore-id="buttonTertiary" class="e-101040-button-tertiary e-101040-button-tertiary--icon-only" aria-label="Share" style="border:0;background:none;color:#b3b3b3;padding:8px"><span aria-hidden="true" class="e-101040-button__icon-wrapper">${icon('M12 1.5 7.3 6.2l1.4 1.4L11 5.3V15h2V5.3l2.3 2.3 1.4-1.4L12 1.5zM4 9v12h16V9h-4v2h2v8H6v-8h2V9H4z')}</span></button>`, 'Share', tooltip === 'share')
      + `</div></div></div></div></a></section>`);
    // As Encore does, the artwork is as wide as the card's layout is tall (a ResizeObserver).
    const section = parent.lastElementChild, layout = section.querySelector('._layout-container_lx1hg_34'), image = layout.firstElementChild;
    new ResizeObserver(([e]) => { image.style.width = image.style.maxHeight = e.contentRect.height + 'px'; }).observe(layout);
    return section;
  };
  // ?spicetify=nobindings: Spicetify 2.46.2 after skipping its webpack bindings on a cold start. Player.origin, Player.data,
  // GraphQL.Request, Locale, CosmosAsync and addToQueue are missing; Platform still has PlayerAPI, GraphQLLoader,
  // Translations and Session. As in Spicetify, Player.data, addToQueue and CosmosAsync come once Player.origin exists.
  if (new URLSearchParams(location.search).get('spicetify') === 'nobindings') {
    const P = Spicetify.Platform, player = Spicetify.Player, data = player.data, cosmos = Spicetify.CosmosAsync, addToQueue = Spicetify.addToQueue;
    P.PlayerAPI._state = player.origin._state; delete player.origin; delete player.data;
    P.GraphQLLoader = Spicetify.GraphQL.Request; Spicetify.GraphQL = { Definitions: Spicetify.GraphQL.Definitions };
    P.Session = { locale: new URLSearchParams(location.search).get('locale') || 'tr' };
    P.Translations = { save_to_your_library: 'Kitaplığına Kaydet', remove_from_your_library: 'Kitaplığından Kaldır', 'web-player.aligned-curation.tooltips.remove-from-liked-songs': "Beğenilen Şarkılar'dan Kaldır" };
    delete Spicetify.Locale; delete Spicetify.CosmosAsync; delete Spicetify.addToQueue;
    (function bindings() {
      if (!Spicetify.Player.origin?._state) { setTimeout(bindings, 10); return; }
      Spicetify.Player.data = data; Spicetify.addToQueue = addToQueue;
      Object.defineProperty(Spicetify, 'CosmosAsync', { get: () => cosmos, configurable: true });
    })();
  }
})();
