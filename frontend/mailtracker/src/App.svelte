<script>
  // const baseUrl = 'http://localhost:5001/scaccia-mailtracker/us-central1'
  const baseUrl = 'https://europe-west3-scaccia-mailtracker.cloudfunctions.net/mailTracker'
  // const baseUrl = '/'
  let description = ''
  let id = null;
  let activated = false;
  const create = async () => {
    const response = await fetch(`${baseUrl}/create?description=${description}`)
    const json = await response.json();
    id = json.id;
  }

  const activate = async () => {
    const response = await fetch(`${baseUrl}/activate?imgId=${id}`)
    if (response.status === 200) {
      activated = true;
    }
  }
</script>

<main>
  <div>
    {#if !id}
      Description: <input bind:value={description} type="text"/>
      <button on:click={create} disabled={!description}>Create</button>
    {/if}

    {#if id}
      ---- <img src="{baseUrl}/track?imgId={id}"/> ---
      <button on:click={activate} disabled={activated}>Activate</button>
    {/if}

  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
