import { Camera } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [detectedItem, setDetectedItem] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const cameraRef = useRef(null);

  // Request camera permission (mobile only)
  useEffect(() => {
    if (Platform.OS !== "web") {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      })();
    } else {
      setHasPermission(true); // Web: auto-allow
    }
  }, []);

  // Mock detection (simulate item detection -- just for testing)
  // setDetectedItem({ name: detectedName, price: detectedPrice }); line 26-31 can remove
  useEffect(() => {
    const timer = setTimeout(() => {
      setDetectedItem({ name: "Apple", price: 1.0 });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  //addToCart button function
  const addToCart = () => {
    if (!detectedItem) return;

    const existing = cartItems.find((i) => i.name === detectedItem.name);
    if (existing) {
      setCartItems(
        cartItems.map((i) =>
          i.name === detectedItem.name ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCartItems([...cartItems, { ...detectedItem, quantity: 1 }]);
    }
    setDetectedItem(null);
  };

  const removeItem = (name) => {
    setCartItems(cartItems.filter((item) => item.name !== name));
  };

  const totalCost = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // HANDLE WEB
  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <Text style={{ fontSize: 20, marginBottom: 10 }}>📷 Camera Preview Disabled on Web</Text>
        <Text style={{ opacity: 0.6, marginBottom: 20 }}>
          (Expo-camera does not work fully in web mode)
        </Text>

        <TouchableOpacity
          style={[styles.addButton, { opacity: detectedItem ? 1 : 0.5 }]}
          disabled={!detectedItem}
          onPress={addToCart}
        >
          <Text style={styles.btnText}>
            {detectedItem ? `Add ${detectedItem.name} to Cart` : "Detecting Item..."}
          </Text>
        </TouchableOpacity>

        <View style={styles.cart}>
          <Text style={styles.cartTitle}>Cart</Text>
          <FlatList
            data={cartItems}
            keyExtractor={(i) => i.name}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Text>
                  {item.name} x {item.quantity} - ${item.price * item.quantity}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.name)}>
                  <Text style={styles.removeBtn}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <Text style={styles.total}>Total: ${totalCost.toFixed(2)}</Text>
        </View>
      </View>
    );
  }

  // MOBILE CAMERA PERMISSION
  if (hasPermission === null)
    return <Text style={styles.center}>Requesting camera permission...</Text>;
  if (hasPermission === false)
    return <Text style={styles.center}>Camera permission denied</Text>;

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} type={Camera.Constants.Type.back} />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.addButton, { opacity: detectedItem ? 1 : 0.5 }]}
          disabled={!detectedItem}
          onPress={addToCart}
        >
          <Text style={styles.btnText}>
            {detectedItem ? `Add ${detectedItem.name} to Cart` : "Detecting Item..."}
          </Text>
        </TouchableOpacity>

        {/* Cart */}
        <View style={styles.cart}>
          <Text style={styles.cartTitle}>Cart</Text>

          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Text>
                  {item.name} x {item.quantity} - ${item.price * item.quantity}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.name)}>
                  <Text style={styles.removeBtn}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <Text style={styles.total}>Total: ${totalCost.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    backgroundColor: "#f3f3f3",
  },
  center: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingBottom: 30,
    alignItems: "center",
  },
  addButton: {
    width: "88%",
    paddingVertical: 18,
    backgroundColor: "#ff6b00",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  btnText: { color: "white", fontSize: 18, fontWeight: "600" },
  cart: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    maxHeight: 260,
  },
  cartTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  removeBtn: { color: "red", fontWeight: "600" },
  total: { marginTop: 8, fontWeight: "700", textAlign: "right" },
});
