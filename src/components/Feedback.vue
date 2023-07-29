<template>
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
</template>

<script>
import props from '@/utils/props.js'

export default {
  name: 'Feedback',

  props: {
    player: props.player
  },

  data() {
    return {
      feedbackDeferred: {},
      feedbackPrimary: true,
      feedbackTimeout: null,
    }
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
  }
}
</script>

<style src="@/styles/components/feedback.scss" lang="scss" scoped></style>
