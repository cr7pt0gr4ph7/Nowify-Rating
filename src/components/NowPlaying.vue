<template>
  <div id="app">
    <div
      v-if="player.playing"
      class="now-playing"
      :class="getNowPlayingClass()"
    >
      <div class="now-playing__container">
        <div class="now-playing__cover">
          <div class="now-playing__pulses">
            <div class="now-playing__pulse wave1"></div>
            <div class="now-playing__pulse wave2"></div>
            <div class="now-playing__pulse wave3"></div>
            <div class="now-playing__pulse wave4"></div>
            <div class="now-playing__pulse wave5"></div>
            <img
              :src="player.trackAlbum.image"
              :alt="player.trackTitle"
              class="now-playing__image"
            />
          </div>
        </div>
        <div class="now-playing__details">
          <h1 class="now-playing__track" v-text="player.trackTitle"></h1>
          <h2 class="now-playing__artists" v-text="getTrackArtists"></h2>
        </div>
      </div>
      <div
        v-if="feedbackPrimary"
        class="now-playing__rating">
        <div class="now-playing__question">How do you like the current music?</div>
        <div class="now-playing__ratings">
          <div class="rating-option rating-dissatisfied" @click="sendPrimaryFeedback(2)">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">sentiment_dissatisfied</span>
            </div>
            <div class="rating-option__text">Meh!</div>
          </div>
          <div class="rating-option rating-neutral" @click="sendPrimaryFeedback(3)">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">sentiment_neutral</span>
            </div>
            <div class="rating-option__text">Neutral</div>
          </div>
          <div class="rating-option rating-satisfied" @click="sendPrimaryFeedback(4)">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">sentiment_satisfied</span>
            </div>
            <div class="rating-option__text">Good</div>
          </div>
          <div class="rating-option rating-very-satisfied" @click="sendPrimaryFeedback(5)">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">sentiment_very_satisfied</span>
            </div>
            <div class="rating-option__text">Great!</div>
          </div>
        </div>
      </div>
      <div
        v-if="!feedbackPrimary"
        class="now-playing__rating">
        <div class="now-playing__question">What could be better?</div>
        <div class="now-playing__ratings">
          <div class="rating-option rating-slower" @click="sendAdditionalFeedback('Slower')">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">keyboard_double_arrow_down</span>
            </div>
            <div class="rating-option__text">Slower Music (Too fast)</div>
          </div>
          <div class="rating-option rating-faster" @click="sendAdditionalFeedback('Faster')">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">keyboard_double_arrow_up</span>
            </div>
            <div class="rating-option__text">Faster Music (Too slow)</div>
          </div>
          <div class="rating-option rating-music" @click="sendAdditionalFeedback('Music')">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">rotate_right</span>
            </div>
            <div class="rating-option__text">Different Music Style</div>
          </div>
          <div class="rating-option rating-air" @click="sendAdditionalFeedback('Air')">
            <div class="rating-option__icon">
              <span class="material-symbols-outlined">air</span>
            </div>
            <div class="rating-option__text">Air Break Please!</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as Vibrant from 'node-vibrant'

import props from '@/utils/props.js'

export default {
  name: 'NowPlaying',

  props: {
    auth: props.auth,
    endpoints: props.endpoints,
    player: props.player
  },

  data() {
    return {
      pollPlaying: '',
      playerResponse: {},
      playerData: this.getEmptyPlayer(),
      feedbackDeferred: {},
      feedbackPrimary: true,
      colourPalette: '',
      swatches: []
    }
  },

  computed: {
    /**
     * Return a comma-separated list of track artists.
     * @return {String}
     */
    getTrackArtists() {
      return this.player.trackArtists.join(', ')
    }
  },

  mounted() {
    this.setDataInterval()
  },

  beforeDestroy() {
    clearInterval(this.pollPlaying)
  },

  methods: {
    /**
     * Make the network request to Google Forms to record a selected feedback button.
     */
    async sendFeedback(sentimentNumber, suggestion, songName) {
      await fetch(`https://docs.google.com/forms/d/e/1FAIpQLSdllaBvx8fsxDINUnXaRtRnKjANfxCX--5RUl0ts7JVjhgOKQ/formResponse?submit=Submit&usp=pp_url&entry.1463587533=${sentimentNumber}&entry.545794514=${songName}&entry.1789954540=${suggestion}`)
    },

    async sendPrimaryFeedback(sentimentNumber) {
      /* TODO: Extract this into a separate endpoint property */
      let songName = this.getSongNameAndArtist()
      this.feedbackDeferred = {
        song: songName,
        sentiment: sentimentNumber
      };
      this.feedbackPrimary = false
    },

    async sendAdditionalFeedback(suggestion) {
      /* TODO: Extract this into a separate endpoint property */
      let d = this.feedbackDeferred
      this.feedbackDeferred = {}
      this.feedbackPrimary = true
      this.sendFeedback(d.sentiment, suggestion, d.song)
    },

    getSongNameAndArtist() {
      if (this.playerData.trackTitle == "") {
        return ""
      }
      return this.playerData.trackTitle + " - " + this.playerData.trackArtists.join(", ")
    },

    /**
     * Make the network request to Spotify to
     * get the current played track.
     */
    async getNowPlaying() {
      let data = {}

      try {
        const response = await fetch(
          `${this.endpoints.base}/${this.endpoints.nowPlaying}`,
          {
            headers: {
              Authorization: `Bearer ${this.auth.accessToken}`
            }
          }
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
          data = this.getEmptyPlayer()
          this.playerData = data

          this.$nextTick(() => {
            this.$emit('spotifyTrackUpdated', data)
          })

          return
        }

        data = await response.json()

        const audioFeaturesResponse = await fetch(
          `${this.endpoints.base}/${this.endpoints.audioFeatures}?ids=${data.item.id}`,
          {
            headers: {
              Authorization: `Bearer ${this.auth.accessToken}`
            }
          }
        )
        const audioFeaturesJson = await audioFeaturesResponse.json();

        data.audioFeatures = audioFeaturesJson.audio_features[0];

        this.playerResponse = data
      } catch (error) {
        this.handleExpiredToken()

        data = this.getEmptyPlayer()
        this.playerData = data

        this.$nextTick(() => {
          this.$emit('spotifyTrackUpdated', data)
        })
      }
    },

    /**
     * Get the Now Playing element class.
     * @return {String}
     */
    getNowPlayingClass() {
      const playerClass = this.player.playing ? 'active' : 'idle'
      return `now-playing--${playerClass}`
    },

    /**
     * Get the colour palette from the album cover.
     */
    getAlbumColours() {
      /**
       * No image (rare).
       */
      if (!this.player.trackAlbum?.image) {
        return
      }

      /**
       * Run node-vibrant to get colours.
       */
      Vibrant.from(this.player.trackAlbum.image)
        .quality(1)
        .clearFilters()
        .getPalette()
        .then(palette => {
          this.handleAlbumPalette(palette)
        })
    },

    /**
     * Return a formatted empty object for an idle player.
     * @return {Object}
     */
    getEmptyPlayer() {
      return {
        playing: false,
        trackAlbum: {},
        trackArtists: [],
        trackBpm: 90,
        trackId: '',
        trackTitle: ''
      }
    },

    /**
     * Poll Spotify for data.
     */
    setDataInterval() {
      clearInterval(this.pollPlaying)
      this.pollPlaying = setInterval(() => {
        this.getNowPlaying()
      }, 2500)
    },

    /**
     * Set the stylings of the app based on received colours.
     */
    setAppColours() {
      document.documentElement.style.setProperty(
        '--color-text-primary',
        this.colourPalette.text
      )

      document.documentElement.style.setProperty(
        '--colour-background-now-playing',
        this.colourPalette.background
      )

      document.documentElement.style.setProperty(
        '--colour-secondary-background-now-playing',
        this.colourPalette.backgroundSecondary
      )
    },

    /**
     * Set the song BPM based on the received metadata.
     */
    setSongBpm() {
      document.documentElement.style.setProperty(
        '--song-bpm-now-playing',
        this.playerData.trackBpm
      )
    },

    /**
     * Handle newly updated Spotify Tracks.
     */
    handleNowPlaying() {
      if (
        this.playerResponse.error?.status === 401 ||
        this.playerResponse.error?.status === 400
      ) {
        this.handleExpiredToken()

        return
      }

      /**
       * Player is active, but user has paused.
       */
      if (this.playerResponse.is_playing === false) {
        this.playerData = this.getEmptyPlayer()

        return
      }

      /**
       * The newly fetched track is the same as our stored
       * one, we don't want to update the DOM yet.
       */
      if (this.playerResponse.item?.id === this.playerData.trackId) {
        return
      }

      /**
       * Store the current active track.
       */
      this.playerData = {
        playing: this.playerResponse.is_playing,
        trackArtists: this.playerResponse.item.artists.map(
          artist => artist.name
        ),
        trackTitle: this.playerResponse.item.name,
        trackId: this.playerResponse.item.id,
        trackAlbum: {
          title: this.playerResponse.item.album.name,
          image: this.playerResponse.item.album.images[0].url
        },
        trackBpm: this.clampBpmRange(this.playerResponse.audioFeatures.tempo)
      }
    },

    /**
     * Clamp the detected BPM value to a sensible range.
     * @return {Number}
     */
    clampBpmRange(detectedBpm) {
      const lowerBound = 50
      const upperBound = 135
      var bpm = detectedBpm

      while (bpm > upperBound) {
        bpm = bpm / 2
      }

      while (bpm < lowerBound) {
        bpm = bpm * 2
      }
  
      return bpm
    },

    /**
     * Handle newly stored colour palette:
     * - Map data to readable format
     * - Get and store random colour combination.
     */
    handleAlbumPalette(palette) {
      let albumColours = Object.keys(palette)
        .filter(item => {
          return item === null ? null : item
        })
        .map(colour => {
          return {
            text: palette[colour].getTitleTextColor(),
            background: palette[colour].getHex(),
            backgroundSecondary: palette[colour].getHex()
          }
        })

      this.swatches = albumColours

      let mainColours = albumColours[Math.floor(Math.random() * albumColours.length)]
      let secondaryColours = albumColours[Math.floor(Math.random() * albumColours.length)]
      
      this.colourPalette = {
        text: mainColours.text,
        background: mainColours.background,
        backgroundSecondary: secondaryColours.background
      }

      this.$nextTick(() => {
        this.setAppColours()
      })
    },

    /**
     * Handle an expired access token from Spotify.
     */
    handleExpiredToken() {
      clearInterval(this.pollPlaying)
      this.$emit('requestRefreshToken')
    }
  },
  watch: {
    /**
     * Watch the auth object returned from Spotify.
     */
    auth: function(oldVal, newVal) {
      if (newVal.status === false) {
        clearInterval(this.pollPlaying)
      }
    },

    /**
     * Watch the returned track object.
     */
    playerResponse: function() {
      this.handleNowPlaying()
    },

    /**
     * Watch our locally stored track data.
     */
    playerData: function() {
      this.$emit('spotifyTrackUpdated', this.playerData)

      this.$nextTick(() => {
        this.setSongBpm()
        this.getAlbumColours()
      })
    }
  }
}
</script>

<style src="@/styles/components/now-playing.scss" lang="scss" scoped></style>
