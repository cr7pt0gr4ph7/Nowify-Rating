<template>
  <div id="now-playing-app">
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
          <div class="rating-option rating-very-satisfied" @click="sendPrimaryFeedback(5, true)">
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
    <div v-else class="now-playing" :class="getNowPlayingClass()">
      <div class="now-playing__container">
        <h1 class="now-playing__idle-heading">No music is playing 😔</h1>
      </div>
    </div>
  </div>
</template>

<script>
import * as Vibrant from 'node-vibrant'

import props from '@/utils/props.js'
import { SpotifyConnector } from '@/services/Spotify.js'

export default {
  name: 'NowPlaying',

  props: {
    auth: props.auth,
    endpoints: props.endpoints
  },

  data() {
    let connector = new SpotifyConnector({
      auth: this.auth,
      endpoints: this.endpoints,
      requestRefreshToken: () => this.$emit('requestRefreshToken'),
      playerStatusUpdated: (data) => {
        this.player = data
        this.$nextTick(() => {
          this.$emit('spotifyTrackUpdated', data)
        })
      }
    })

    return {
      playerConnector: connector,
      player: connector.player,
      feedbackDeferred: {},
      feedbackPrimary: true,
      feedbackTimeout: null,
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
    },
  },

  mounted() {
    this.playerConnector.startPolling()
  },

  beforeDestroy() {
    this.playerConnector.stopPolling()
  },

  methods: {
    /**
     * Make the network request to Google Forms to record a selected feedback button.
     */
    async sendFeedback(sentimentNumber, suggestion, songName) {
      /* TODO: Extract this into a separate endpoint property */
      await fetch(`https://docs.google.com/forms/d/e/1FAIpQLSdllaBvx8fsxDINUnXaRtRnKjANfxCX--5RUl0ts7JVjhgOKQ/formResponse?submit=Submit&usp=pp_url&entry.1463587533=${sentimentNumber}&entry.545794514=${songName}&entry.1789954540=${suggestion}`)
    },

    async sendPrimaryFeedback(sentimentNumber, sendImmediately) {
      let songName = this.getSongNameAndArtist()
      this.feedbackDeferred = {
        song: songName,
        sentiment: sentimentNumber
      };
      this.feedbackPrimary = false

      if (this.feedbackTimeout) {
        clearTimeout(this.feedbackTimeout)
        this.feedbackTimeout = null
      }

      if (sendImmediately) {
        this.sendAdditionalFeedback("")
      }
     
      this.feedbackTimeout = setTimeout(() => this.sendAdditionalFeedback(""), 10 * 1000)
    },

    async sendAdditionalFeedback(suggestion) {
      if (this.feedbackTimeout) {
        clearTimeout(this.feedbackTimeout)
        this.feedbackTimeout = null
      }
      let d = this.feedbackDeferred
      this.feedbackDeferred = {}
      this.feedbackPrimary = true
      this.sendFeedback(d.sentiment, suggestion, d.song)
    },

    getSongNameAndArtist() {
      if (this.player.trackTitle == "") {
        return ""
      }
      return this.player.trackTitle + " - " + this.player.trackArtists.join(", ")
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
    updateAlbumColours() {
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
        this.player.trackBpm
      )
    }
  },
  watch: {
    /**
     * Watch the auth object returned from Spotify.
     */
    auth: function(oldVal, newVal) {
      this.playerConnector.setAuth(newVal)
    },

    /**
     * Watch our locally stored track data.
     */
    player: function() {
      this.$nextTick(() => {
        this.setSongBpm()
        this.updateAlbumColours()
      })
    }
  }
}
</script>

<style src="@/styles/components/now-playing.scss" lang="scss" scoped></style>
