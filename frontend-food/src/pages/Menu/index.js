import React, { useEffect, useState } from "react";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Chip from "@material-ui/core/Chip";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import PlaylistAddIcon from "@material-ui/icons/PlaylistAdd";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  groupHeader: { fontWeight: "bold" },
  card: { maxWidth: 200 },
  media: { height: 120 },
  addBtn: { marginBottom: theme.spacing(2) },
  complementRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  aiChip: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    fontWeight: "bold",
  },
}));

const emptyItem = { name: "", description: "", price: "", sortOrder: 0, image: null, hasComplements: false, complements: [] };

const MenuPage = () => {
  const classes = useStyles();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialogo grupo
  const [groupDialog, setGroupDialog] = useState({ open: false, id: null, name: "", sortOrder: 0, image: null, imageUrl: null });

  // Dialogo complementos do grupo
  const [groupCompDialog, setGroupCompDialog] = useState({ open: false, groupId: null, groupName: "", complements: [] });
  const [savingGroupComps, setSavingGroupComps] = useState(false);

  // Dialogo item
  const [itemDialog, setItemDialog] = useState({ open: false, groupId: null, id: null, ...emptyItem });
  const [savingItem, setSavingItem] = useState(false);

  // AI Import
  const [aiDialog, setAiDialog] = useState({ open: false });
  const [aiFiles, setAiFiles] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiItems, setAiItems] = useState(null); // null = not analyzed yet

  const load = async () => {
    try {
      const { data } = await api.get("/api/food/menu/groups");
      setGroups(data);
    } catch { toast.error("Erro ao carregar cardapio"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Grupos ──
  const saveGroup = async () => {
    try {
      const form = new FormData();
      form.append("name", groupDialog.name);
      form.append("sortOrder", groupDialog.sortOrder);
      if (groupDialog.image) form.append("image", groupDialog.image);

      if (groupDialog.id) {
        await api.put(`/api/food/menu/groups/${groupDialog.id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/api/food/menu/groups", form, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success("Grupo salvo!");
      setGroupDialog({ open: false, id: null, name: "", sortOrder: 0, image: null, imageUrl: null });
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erro"); }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm("Remover grupo e todos seus itens?")) return;
    try {
      await api.delete(`/api/food/menu/groups/${id}`);
      toast.success("Grupo removido");
      load();
    } catch { toast.error("Erro ao remover grupo"); }
  };

  // ── Itens ──
  const openItemDialog = (groupId, item = null) => {
    if (item) {
      setItemDialog({
        open: true,
        groupId,
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        sortOrder: item.sortOrder,
        image: null,
        hasComplements: item.hasComplements || false,
        complements: item.complements ? item.complements.map(c => ({ ...c })) : [],
      });
    } else {
      setItemDialog({ open: true, groupId, id: null, ...emptyItem });
    }
  };

  const saveItem = async () => {
    setSavingItem(true);
    try {
      const form = new FormData();
      form.append("name", itemDialog.name);
      form.append("description", itemDialog.description);
      form.append("price", itemDialog.price);
      form.append("sortOrder", itemDialog.sortOrder);
      form.append("hasComplements", itemDialog.hasComplements ? "true" : "false");
      if (itemDialog.image) form.append("image", itemDialog.image);

      let savedItemId = itemDialog.id;
      if (itemDialog.id) {
        await api.put(`/api/food/menu/items/${itemDialog.id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { data } = await api.post(`/api/food/menu/groups/${itemDialog.groupId}/items`, form, { headers: { "Content-Type": "multipart/form-data" } });
        savedItemId = data.id;
      }

      // Save complements
      await api.post(`/api/food/menu/items/${savedItemId}/complements`, {
        hasComplements: itemDialog.hasComplements,
        complements: itemDialog.complements,
      });

      toast.success("Item salvo!");
      setItemDialog({ open: false, groupId: null, id: null, ...emptyItem });
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erro"); }
    finally { setSavingItem(false); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Remover item?")) return;
    try {
      await api.delete(`/api/food/menu/items/${id}`);
      toast.success("Item removido");
      load();
    } catch { toast.error("Erro ao remover item"); }
  };

  // ── Complementos (dentro do dialog de item) ──
  const addComplement = () => {
    setItemDialog(d => ({ ...d, complements: [...d.complements, { name: "", price: "0" }] }));
  };

  const updateComplement = (idx, field, value) => {
    setItemDialog(d => {
      const updated = [...d.complements];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...d, complements: updated };
    });
  };

  const removeComplement = (idx) => {
    setItemDialog(d => ({ ...d, complements: d.complements.filter((_, i) => i !== idx) }));
  };

  // ── Complementos do grupo ──
  const openGroupCompDialog = (group) => {
    // Pega os complementos do primeiro item do grupo como template
    const firstItem = (group.items || [])[0];
    const comps = firstItem?.complements
      ? firstItem.complements.map(c => ({ name: c.name, price: String(c.price) }))
      : [];
    setGroupCompDialog({ open: true, groupId: group.id, groupName: group.name, complements: comps });
  };

  const saveGroupComplements = async () => {
    setSavingGroupComps(true);
    try {
      const { updated } = (await api.post(
        `/api/food/menu/groups/${groupCompDialog.groupId}/bulk-complements`,
        { complements: groupCompDialog.complements }
      )).data;
      toast.success(`Complementos aplicados em ${updated} item(s)!`);
      setGroupCompDialog({ open: false, groupId: null, groupName: "", complements: [] });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao salvar complementos");
    } finally {
      setSavingGroupComps(false);
    }
  };

  const addGroupComplement = () => {
    setGroupCompDialog(d => ({ ...d, complements: [...d.complements, { name: "", price: "0" }] }));
  };

  const updateGroupComplement = (idx, field, value) => {
    setGroupCompDialog(d => {
      const updated = [...d.complements];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...d, complements: updated };
    });
  };

  const removeGroupComplement = (idx) => {
    setGroupCompDialog(d => ({ ...d, complements: d.complements.filter((_, i) => i !== idx) }));
  };

  // ── AI Import ──
  const runAiAnalysis = async () => {
    if (!aiFiles.length) { toast.error("Selecione pelo menos uma imagem ou PDF"); return; }
    setAiLoading(true);
    setAiItems(null);
    try {
      const form = new FormData();
      for (const f of aiFiles) form.append("files", f);
      const { data } = await api.post("/api/food/menu/ai-import", form, { headers: { "Content-Type": "multipart/form-data" } });
      const withGroups = data.items.map(item => ({ ...item, groupName: item.suggestedGroup || "", groupId: "" }));
      setAiItems(withGroups);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao analisar com IA");
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiItems = async () => {
    try {
      const toSave = aiItems.filter(i => i.name && i.name.trim() && (i.groupId || i.groupName));
      if (!toSave.length) { toast.error("Nenhum item com grupo selecionado"); return; }
      const { data } = await api.post("/api/food/menu/ai-import/save", { items: toSave });
      toast.success(`${data.created} itens importados com sucesso!`);
      setAiDialog({ open: false });
      setAiFiles([]);
      setAiItems(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao salvar itens");
    }
  };

  const updateAiItem = (idx, field, value) => {
    setAiItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeAiItem = (idx) => {
    setAiItems(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Cardapio</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<CloudUploadIcon />}
            className={classes.aiChip}
            style={{ marginRight: 8 }}
            onClick={() => { setAiDialog({ open: true }); setAiFiles([]); setAiItems(null); }}>
            Importar com IA
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />}
            onClick={() => setGroupDialog({ open: true, id: null, name: "", sortOrder: 0 })}>
            Novo Grupo
          </Button>
        </Box>
      </Box>

      {groups.length === 0 && (
        <Typography color="textSecondary">Nenhum grupo criado. Comece criando um grupo como "Bebidas" ou "Hambúrgueres".</Typography>
      )}

      {groups.map(group => (
        <Accordion key={group.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Typography className={classes.groupHeader}>{group.name}</Typography>
              <Box onClick={e => e.stopPropagation()}>
                <IconButton size="small" title="Complementos do grupo" onClick={() => openGroupCompDialog(group)}>
                  <PlaylistAddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setGroupDialog({ open: true, id: group.id, name: group.name, sortOrder: group.sortOrder, image: null, imageUrl: group.imageUrl })}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => deleteGroup(group.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box width="100%">
              <Button size="small" startIcon={<AddIcon />} onClick={() => openItemDialog(group.id, null)}>
                Adicionar item
              </Button>
              <Grid container spacing={2} style={{ marginTop: 8 }}>
                {(group.items || []).map(item => (
                  <Grid item key={item.id}>
                    <Card className={classes.card}>
                      {item.imageUrl && (
                        <CardMedia className={classes.media} image={`${FOOD_API}${item.imageUrl}`} title={item.name} />
                      )}
                      <CardContent>
                        <Typography variant="subtitle2">{item.name}</Typography>
                        <Typography variant="caption" color="textSecondary">{item.description}</Typography>
                        <Typography variant="body2" color="primary">R$ {parseFloat(item.price).toFixed(2)}</Typography>
                        {item.hasComplements && (
                          <Chip label="Com complementos" size="small" style={{ marginTop: 4, fontSize: 10 }} />
                        )}
                      </CardContent>
                      <CardActions>
                        <IconButton size="small" onClick={() => openItemDialog(group.id, item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => deleteItem(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Dialog grupo */}
      <Dialog open={groupDialog.open} onClose={() => setGroupDialog(g => ({ ...g, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{groupDialog.id ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Nome do grupo" value={groupDialog.name}
            onChange={e => setGroupDialog(g => ({ ...g, name: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Ordem" type="number" value={groupDialog.sortOrder}
            onChange={e => setGroupDialog(g => ({ ...g, sortOrder: e.target.value }))} margin="normal" />
          {groupDialog.imageUrl && !groupDialog.image && (
            <img src={`${FOOD_API}${groupDialog.imageUrl}`} alt="grupo" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, marginTop: 8 }} />
          )}
          <Button variant="outlined" component="label" style={{ marginTop: 8, display: "block" }}>
            {groupDialog.image ? "Foto selecionada ✓" : "Foto do grupo (opcional)"}
            <input type="file" accept="image/*" hidden onChange={e => setGroupDialog(g => ({ ...g, image: e.target.files[0] }))} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(g => ({ ...g, open: false }))}>Cancelar</Button>
          <Button onClick={saveGroup} color="primary" variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog item */}
      <Dialog open={itemDialog.open} onClose={() => !savingItem && setItemDialog(i => ({ ...i, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{itemDialog.id ? "Editar Item" : "Novo Item"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Nome" value={itemDialog.name}
            onChange={e => setItemDialog(i => ({ ...i, name: e.target.value }))} margin="normal" />
          <TextField fullWidth multiline rows={2} label="Descricao" value={itemDialog.description}
            onChange={e => setItemDialog(i => ({ ...i, description: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Preco (R$)" type="number" value={itemDialog.price}
            onChange={e => setItemDialog(i => ({ ...i, price: e.target.value }))} margin="normal" />
          <Button variant="outlined" component="label" style={{ marginTop: 8 }}>
            {itemDialog.image ? "Foto selecionada ✓" : "Selecionar foto"}
            <input type="file" accept="image/*" hidden onChange={e => setItemDialog(i => ({ ...i, image: e.target.files[0] }))} />
          </Button>

          {/* Complementos */}
          <Box mt={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={itemDialog.hasComplements}
                  onChange={e => setItemDialog(i => ({ ...i, hasComplements: e.target.checked }))}
                  color="primary"
                />
              }
              label="Este item tem complementos (ex: coberturas do acai)"
            />
            {itemDialog.hasComplements && (
              <Box mt={1}>
                <Typography variant="caption" color="textSecondary">
                  Adicione os complementos disponíveis e seus precos:
                </Typography>
                {itemDialog.complements.map((c, idx) => (
                  <div key={idx} className={classes.complementRow}>
                    <TextField
                      size="small"
                      label="Nome do complemento"
                      value={c.name}
                      onChange={e => updateComplement(idx, "name", e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <TextField
                      size="small"
                      label="Preco"
                      type="number"
                      value={c.price}
                      onChange={e => updateComplement(idx, "price", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <IconButton size="small" onClick={() => removeComplement(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </div>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addComplement} style={{ marginTop: 4 }}>
                  Adicionar complemento
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog(i => ({ ...i, open: false }))} disabled={savingItem}>Cancelar</Button>
          <Button onClick={saveItem} color="primary" variant="contained" disabled={savingItem}>
            {savingItem ? <CircularProgress size={20} /> : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog complementos do grupo */}
      <Dialog
        open={groupCompDialog.open}
        onClose={() => !savingGroupComps && setGroupCompDialog(d => ({ ...d, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Complementos do grupo: {groupCompDialog.groupName}
          <Typography variant="caption" display="block" color="textSecondary">
            Ao salvar, esses complementos serao aplicados em TODOS os itens deste grupo.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="textSecondary" gutterBottom display="block">
            Deixe o preco em 0 para itens inclusos no preco do produto.
          </Typography>
          {groupCompDialog.complements.map((c, idx) => (
            <div key={idx} className={classes.complementRow}>
              <TextField
                size="small"
                label="Nome do complemento"
                value={c.name}
                onChange={e => updateGroupComplement(idx, "name", e.target.value)}
                style={{ flex: 2 }}
              />
              <TextField
                size="small"
                label="Preco (R$)"
                type="number"
                value={c.price}
                onChange={e => updateGroupComplement(idx, "price", e.target.value)}
                style={{ flex: 1 }}
                inputProps={{ step: "0.50", min: "0" }}
              />
              <IconButton size="small" onClick={() => removeGroupComplement(idx)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addGroupComplement} style={{ marginTop: 8 }}>
            Adicionar complemento
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupCompDialog(d => ({ ...d, open: false }))} disabled={savingGroupComps}>
            Cancelar
          </Button>
          <Button onClick={saveGroupComplements} color="primary" variant="contained" disabled={savingGroupComps}>
            {savingGroupComps ? <CircularProgress size={20} /> : "Salvar em todos os itens"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog IA Import */}
      <Dialog open={aiDialog.open} onClose={() => !aiLoading && setAiDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>
          Importar Cardapio com IA
        </DialogTitle>
        <DialogContent>
          {!aiItems ? (
            <Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Envie fotos do cardapio ou um PDF. A IA ira extrair os produtos automaticamente.
                Voce podera revisar e editar antes de salvar.
              </Typography>
              <Button variant="outlined" component="label" style={{ marginTop: 8 }}>
                {aiFiles.length ? `${aiFiles.length} arquivo(s) selecionado(s) ✓` : "Selecionar imagens / PDF"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  hidden
                  onChange={e => setAiFiles(Array.from(e.target.files))}
                />
              </Button>
              {aiFiles.length > 0 && (
                <Box mt={1}>
                  {aiFiles.map((f, i) => (
                    <Typography key={i} variant="caption" display="block" color="textSecondary">
                      {f.name}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" gutterBottom>
                A IA encontrou <strong>{aiItems.length}</strong> produto(s). Revise os dados abaixo e selecione o grupo de cada item:
              </Typography>
              <Box style={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Descricao</TableCell>
                      <TableCell>Preco</TableCell>
                      <TableCell>Grupo</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aiItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={e => updateAiItem(idx, "name", e.target.value)}
                            style={{ minWidth: 140 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.description || ""}
                            onChange={e => updateAiItem(idx, "description", e.target.value)}
                            style={{ minWidth: 120 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.price}
                            onChange={e => updateAiItem(idx, "price", e.target.value)}
                            style={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" style={{ minWidth: 140 }}>
                            <Select
                              value={item.groupId || "__new__"}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === "__new__") {
                                  updateAiItem(idx, "groupId", "");
                                } else {
                                  const g = groups.find(g => g.id === val);
                                  updateAiItem(idx, "groupId", val);
                                  updateAiItem(idx, "groupName", g ? g.name : "");
                                }
                              }}
                              displayEmpty
                            >
                              <MenuItem value="__new__">
                                <em>{item.groupName || "Novo: " + (item.suggestedGroup || "")}</em>
                              </MenuItem>
                              {groups.map(g => (
                                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {!item.groupId && (
                            <TextField
                              size="small"
                              placeholder="Nome do novo grupo"
                              value={item.groupName || ""}
                              onChange={e => updateAiItem(idx, "groupName", e.target.value)}
                              style={{ marginTop: 4, width: "100%" }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeAiItem(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAiDialog({ open: false }); setAiFiles([]); setAiItems(null); }} disabled={aiLoading}>
            Cancelar
          </Button>
          {!aiItems ? (
            <Button onClick={runAiAnalysis} color="primary" variant="contained" disabled={aiLoading || !aiFiles.length}>
              {aiLoading ? <><CircularProgress size={16} style={{ marginRight: 8 }} />Analisando...</> : "Analisar com IA"}
            </Button>
          ) : (
            <>
              <Button onClick={() => setAiItems(null)} disabled={aiLoading}>
                Voltar
              </Button>
              <Button onClick={saveAiItems} color="primary" variant="contained">
                Salvar {aiItems.length} Itens
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MenuPage;
