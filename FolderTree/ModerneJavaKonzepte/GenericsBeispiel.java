public class GenericsBeispiel {
    static class Box<T> {
        private final T wert;

        public Box(T wert) {
            this.wert = wert;
        }

        public T getWert() {
            return this.wert;
        }
    }

    public static void main(String[] args) {
        Box<String> textBox = new Box<>("Typsicher");
        Box<Integer> zahlenBox = new Box<>(42);

        System.out.println(textBox.getWert());
        System.out.println(zahlenBox.getWert());
    }
}
