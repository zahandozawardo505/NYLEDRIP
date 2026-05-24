function seedLocalData() {
    if (!DB.getProducts().length || !DB.getSellers().length) {
        location.reload();
    }
}
