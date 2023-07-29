/**
 * Clamp the detected BPM value to a sensible range.
 * @return {Number}
 */
function clampBpmRange(detectedBpm, lowerBound, upperBound) {
  var bpm = detectedBpm

  while (bpm > upperBound) {
    bpm = bpm / 2
  }

  while (bpm < lowerBound) {
    bpm = bpm * 2
  }

  return bpm
}

export class SpotifyConnector {
  constructor(options) {
    this.endpoints = options.endpoints
    this.auth = options.auth
    this.requestRefreshToken = options.requestRefreshToken
    this.playerStatusUpdated = options.playerStatusUpdated
    this.player = this.getEmptyPlayerStatus()
    this.pollPlaying = ''
    this.isPolling = false
  }

  /**
   * Start polling Spotify for data.
   */
  startPolling() {
    const pollIntervalMs = 2500
    clearInterval(this.pollPlaying)
    this.pollPlaying = setInterval(() => this.updatePlayerStatus(), pollIntervalMs)
    this.isPolling = true
  }

  /**
   * Stop polling Spotify for data.
   */
  stopPolling() {
    clearInterval(this.pollPlaying)
    this.isPolling = false
  }

  /**
   * Handle an expired access token from Spotify.
   */
  handleExpiredToken() {
    this.stopPolling()
    
  }

  setAuth(newAuth) {
    if (newAuth.status === false) {
      this.stopPolling()
    }
  }

  /**
   * Return a formatted empty object for an idle player.
   * @return {Object}
   */
  getEmptyPlayerStatus() {
    return {
      playing: false,
      trackAlbum: {},
      trackArtists: [],
      trackBpm: 90,
      trackId: '',
      trackTitle: ''
    }
  }

  /**
   * Make the network request to Spotify to
   * get the currently played track.
   */
  async updatePlayerStatus() {
    let data = await this.getPlayerStatus()
    if (data) {
      this.player = data
      this.playerStatusUpdated(data)
    }
  }

  /**
   * Make the network request to Spotify to
   * get the current played track.
   */
  async getPlayerStatus() {
    let data = {}

    try {
      const apiFetchOptions = {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`
        }
      }

      const response = await fetch(
        `${this.endpoints.base}/${this.endpoints.nowPlaying}`,
        apiFetchOptions
      )

      /**
       * Fetch error.
       */
      if (!response.ok) {
        throw new Error(`An error has occured: ${response.status}`)
      }

      /**
       * Spotify returns a 204 when no current device session is found.
       * The connection was successful but there's no content to return.
       */
      if (response.status === 204) {
        return this.getEmptyPlayerStatus()
      }

      data = await response.json()

      /**
       * Retrieve the track's audio features from the Spotify API.
       */
      const audioFeaturesResponse = await fetch(
        `${this.endpoints.base}/${this.endpoints.audioFeatures}?ids=${data.item.id}`,
        apiFetchOptions
      )
      const audioFeaturesJson = await audioFeaturesResponse.json();

      data.audioFeatures = audioFeaturesJson.audio_features[0];

      return this.getPlayerStatusFromResponse(data)
    } catch (error) {
      this.handleExpiredToken()
      return this.getEmptyPlayerStatus()
    }
  }

  /**
   * Handle newly updated Spotify Tracks.
   */
  getPlayerStatusFromResponse(result) {
    if (
      result.error?.status === 401 ||
      result.error?.status === 400
    ) {
      this.handleExpiredToken()
      return null
    }

    /**
     * Player is active, but user has paused.
     */
    if (result.is_playing === false) {
      return this.getEmptyPlayerStatus()
    }

    /**
     * The newly fetched track is the same as our stored
     * one, we don't want to update the DOM yet.
     */
    if (result.item?.id === this.player.trackId) {
      return null
    }

    /**
     * Store the current active track.
     */
    return {
      playing: result.is_playing,
      trackArtists: result.item.artists.map(
        artist => artist.name
      ),
      trackTitle: result.item.name,
      trackId: result.item.id,
      trackAlbum: {
        title: result.item.album.name,
        image: result.item.album.images[0].url
      },
      trackBpm: clampBpmRange(result.audioFeatures.tempo, 50, 129)
    }
  }
}
