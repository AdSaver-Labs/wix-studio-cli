async function queryPosts(client, language, limit = 100, offset = 0) {
  const body = { query: { filter: { language }, sort: [], paging: { limit, offset } }, fieldsets: ['METRICS','URL','TRANSLATIONS','CONTENT','SEO'] };
  const json = await client.request('/_api/communities-blog-node-api/v3/posts/query', { method: 'POST', body: JSON.stringify(body) });
  return json;
}
async function getPost(client, id) {
  const qs = 'fieldsets=RICH_CONTENT&fieldsets=URL&fieldsets=TRANSLATIONS';
  const json = await client.request(`/_api/communities-blog-node-api/v3/posts/${id}?${qs}`);
  return json.post;
}
async function createEnDraft(client, sourcePostId, language = 'en') {
  try {
    const json = await client.request(`/_api/communities-blog-node-api/v3/multilingual/draft/${sourcePostId}`, { method: 'POST', body: JSON.stringify({ language, postId: sourcePostId, useAutoTranslation: false }) });
    return json.draftPost?.id || json.post?.id || json.id || json.details?.applicationError?.data?.id;
  } catch (err) {
    if (err.result?.status === 409) {
      const json = err.result.json || JSON.parse(err.result.text || '{}');
      const id = json.details?.applicationError?.data?.id;
      if (id) return id;
    }
    throw err;
  }
}
async function getDraft(client, draftId) {
  const qs = `draftPostId=${draftId}&fieldsets=RICH_CONTENT&fieldsets=URL&fieldsets=TRANSLATIONS`;
  const json = await client.request(`/_api/communities-blog-node-api/v3/draft-posts/${draftId}?${qs}`);
  return json.draftPost;
}
async function updateDraft(client, draftId, draftPost) {
  const body = { draftPost, action: 'UPDATE', fieldsets: ['RICH_CONTENT','URL','TRANSLATIONS'] };
  const json = await client.request(`/_api/communities-blog-node-api/v3/draft-posts/${draftId}`, { method: 'PATCH', body: JSON.stringify(body) });
  return json.draftPost || json.post || json;
}
async function publishDraft(client, draftId) {
  const json = await client.request(`/_api/communities-blog-node-api/v3/draft-posts/${draftId}/publish`, { method: 'POST', body: '{}' });
  return json.post || json.draftPost || json;
}
module.exports = { queryPosts, getPost, createEnDraft, getDraft, updateDraft, publishDraft };
