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
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  groupHeader: { fontWeight: "bold" },
  card: { maxWidth: 200 },
  media: { height: 120 },
  addBtn: { marginBottom: theme.spacing(2) },
}));

const emptyItem = { name: "", description: "", price: "", sortOrder: 0, image: null };

const MenuPage = () => {
  const classes = useStyles();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Diálogo grupo
  const [groupDialog, setGroupDialog] = useState({ open: false, id: null, name: "", sortOrder: 0 });

  // Diálogo item
  const [itemDialog, setItemDialog] = useState({ open: false, groupId: null, id: null, ...emptyItem });

  const load = async () => {
    try {
      const { data } = await api.get("/api/food/menu/groups");
      setGroups(data);
    } catch { toast.error("Erro ao carregar cardápio"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Grupos ──
  const saveGroup = async () => {
    try {
      if (groupDialog.id) {
        await api.put(`/api/food/menu/groups/${groupDialog.id}`, { name: groupDialog.name, sortOrder: groupDialog.sortOrder });
      } else {
        await api.post("/api/food/menu/groups", { name: groupDialog.name, sortOrder: groupDialog.sortOrder });
      }
      toast.success("Grupo salvo!");
      setGroupDialog({ open: false, id: null, name: "", sortOrder: 0 });
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
  const saveItem = async () => {
    try {
      const form = new FormData();
      form.append("name", itemDialog.name);
      form.append("description", itemDialog.description);
      form.append("price", itemDialog.price);
      form.append("sortOrder", itemDialog.sortOrder);
      if (itemDialog.image) form.append("image", itemDialog.image);

      if (itemDialog.id) {
        await api.put(`/api/food/menu/items/${itemDialog.id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post(`/api/food/menu/groups/${itemDialog.groupId}/items`, form, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success("Item salvo!");
      setItemDialog({ open: false, groupId: null, id: null, ...emptyItem });
      load();
    } catch (err) { toast.error(err?.response?.data?.error || "Erro"); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Remover item?")) return;
    try {
      await api.delete(`/api/food/menu/items/${id}`);
      toast.success("Item removido");
      load();
    } catch { toast.error("Erro ao remover item"); }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Cardápio</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />}
          onClick={() => setGroupDialog({ open: true, id: null, name: "", sortOrder: 0 })}>
          Novo Grupo
        </Button>
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
                <IconButton size="small" onClick={() => setGroupDialog({ open: true, id: group.id, name: group.name, sortOrder: group.sortOrder })}>
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
              <Button size="small" startIcon={<AddIcon />} onClick={() => setItemDialog({ open: true, groupId: group.id, id: null, ...emptyItem })}>
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
                      </CardContent>
                      <CardActions>
                        <IconButton size="small" onClick={() => setItemDialog({ open: true, groupId: group.id, id: item.id, name: item.name, description: item.description || "", price: item.price, sortOrder: item.sortOrder, image: null })}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(g => ({ ...g, open: false }))}>Cancelar</Button>
          <Button onClick={saveGroup} color="primary" variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog item */}
      <Dialog open={itemDialog.open} onClose={() => setItemDialog(i => ({ ...i, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{itemDialog.id ? "Editar Item" : "Novo Item"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Nome" value={itemDialog.name}
            onChange={e => setItemDialog(i => ({ ...i, name: e.target.value }))} margin="normal" />
          <TextField fullWidth multiline rows={2} label="Descrição" value={itemDialog.description}
            onChange={e => setItemDialog(i => ({ ...i, description: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Preço (R$)" type="number" value={itemDialog.price}
            onChange={e => setItemDialog(i => ({ ...i, price: e.target.value }))} margin="normal" />
          <Button variant="outlined" component="label" style={{ marginTop: 8 }}>
            {itemDialog.image ? "Foto selecionada ✓" : "Selecionar foto"}
            <input type="file" accept="image/*" hidden onChange={e => setItemDialog(i => ({ ...i, image: e.target.files[0] }))} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog(i => ({ ...i, open: false }))}>Cancelar</Button>
          <Button onClick={saveItem} color="primary" variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MenuPage;
